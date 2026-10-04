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
        responseMimeType: 'application/json',
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

/**
 * 2. AI 營養師問答 API
 */
export async function askDietitianQuestion(question: string, history?: any) {
  try {
    const ai = getAIClient();
    const prompt = `你是一位親切且專業的 AI 健身營養師，請針對以下問題提供簡潔、實用且正確的飲食與健身建議：\n\n問題：${question}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    });

    return response.text || '無法取得回答，請稍後再試。';
  } catch (error: any) {
    console.error('askDietitianQuestion 處理失敗:', error);
    throw new Error(error.message || '回答營養師問題時發生錯誤');
  }
}

/**
 * 3. 推薦食譜生成 API
 */
export async function generateRecommendedRecipes(userGoal?: any, remainingKcal?: any) {
  try {
    const ai = getAIClient();
    const prompt = `
請作為專業營養師，推薦 3 道適合的健身飲食食譜。
使用者資訊：${JSON.stringify({ userGoal, remainingKcal })}

請嚴格以 JSON 陣列格式回傳（勿包含任何說明文字）：
[
  {
    "id": "1",
    "title": "食譜名稱",
    "calories": 450,
    "protein": 35,
    "carbs": 40,
    "fat": 12,
    "prepTime": "15分鐘",
    "ingredients": ["食材1", "食材2"],
    "instructions": ["步驟1", "步驟2"]
  }
]
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini API 未回傳任何結果');
    }

    return cleanAndParseJSON(text);
  } catch (error: any) {
    console.error('generateRecommendedRecipes 處理失敗:', error);
    throw new Error(error.message || '生成推薦食譜時發生錯誤');
  }
}
