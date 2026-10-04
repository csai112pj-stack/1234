import { GoogleGenAI } from '@google/genai';

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('未設定 GEMINI_API_KEY 環境變數，請至 Vercel Dashboard 或 Cloud Run 設定。');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * 安全清理並解析 Gemini 回傳的 JSON 字串
 */
function cleanAndParseJSON(text: string) {
  try {
    let cleaned = text.trim();
    // 移除 Markdown 區塊標記 ```json ... ```
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
    cleaned = cleaned.trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.error('JSON 解析失敗，Gemini 原始回傳內容為:', text);
    throw new Error(`Gemini 回傳內容無法解析為 JSON: ${(error as Error).message}`);
  }
}

/**
 * 1. 分析食物照片 API
 */
export async function analyzeMealImage(base64Image: string, mimeType: string = 'image/jpeg') {
  try {
    const ai = getAIClient();
    
    // 移除 base64 前綴 (如 data:image/png;base64,)
    const pureBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `
你是一位專業的台灣健身營養師。請分析這張食物照片，並嚴格以 JSON 格式回傳（勿包含任何說明文字）：

{
  "foodName": "食物名稱",
  "calories": 750,
  "protein": 35.5,
  "carbs": 80.0,
  "fat": 22.0,
  "fiber": 4.5,
  "sodium": 850,
  "description": "餐點簡評與建議"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: pureBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json', // 強制要求 JSON 回傳
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini API 未回傳任何結果');
    }

    return cleanAndParseJSON(text);
  } catch (error: any) {
    console.error('analyzeMealImage 處理失敗:', error);
    throw new Error(error.message || '分析食物照片時發生未知錯誤');
  }
}
