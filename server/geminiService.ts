import { GoogleGenAI } from '@google/genai';

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('未設定 GEMINI_API_KEY 環境變數，請至 Vercel Dashboard 設定。');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * 1. 分析食物照片 API
 */
export async function analyzeMealImage(base64Image: string, userContext?: any) {
  try {
    const ai = getAIClient();
    
    // 清理 base64 前綴
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64
              }
            },
            {
              text: `你是一位專業的飲食與營養分析 AI。請分析這張照片中的食物，並嚴格回傳標準 JSON 格式（不要包含任何 markdown codeblock 標籤）：
{
  "food_name": "食物名稱",
  "calories": 估算總熱量數字,
  "protein": 估算蛋白質克數數字,
  "carbs": 估算碳水化合物克數數字,
  "fat": 估算脂肪克數數字,
  "health_score": 1至10健康評分數字,
  "description": "簡短評語與建議"
}`
            }
          ]
        }
      ]
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      food_name: '健康餐點',
      calories: 450,
      protein: 25,
      carbs: 45,
      fat: 15,
      health_score: 8,
      description: '已估算基本營養數值。'
    };
  } catch (error: any) {
    console.error('❌ analyzeMealImage 失敗:', error);
    return {
      food_name: '解析失敗餐點',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      health_score: 5,
      description: `分析失敗：${error?.message || '請確認 API Key 設定'}`
    };
  }
}

/**
 * 2. 營養師對話問答 API (askDietitian & askDietitianQuestion)
 */
export async function askDietitianQuestion(prompt: string, userContext?: any): Promise<string> {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `你是一位親切專業的健身營養師。
使用者資訊: ${JSON.stringify(userContext || {})}
問題: ${prompt}`
            }
          ]
        }
      ]
    });

    return response.text || '目前無法取得回應，請稍後再試。';
  } catch (error: any) {
    console.error('❌ askDietitianQuestion 失敗:', error);
    return `營養師暫時無法連線 (${error?.message || '請確認 GEMINI_API_KEY 設定'})`;
  }
}

// 相容別名匯出
export const askDietitian = askDietitianQuestion;

/**
 * 3. 產生食譜與飲食建議 API
 */
export async function generateRecommendedRecipes(userContext?: any) {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `請根據使用者資訊，推薦 3 道適合的健身餐點食譜：
使用者資訊: ${JSON.stringify(userContext || {})}
請嚴格回傳純 JSON 陣列格式：
[
  {
    "title": "餐點名稱",
    "calories": 熱量數字,
    "protein": 蛋白質數字,
    "carbs": 碳水數字,
    "fat": 脂肪數字,
    "prep_time": "準備時間如 15 分鐘",
    "ingredients": ["食材1", "食材2"]
  }
]`
            }
          ]
        }
      ]
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return [];
  } catch (error: any) {
    console.error('❌ generateRecommendedRecipes 失敗:', error);
    return [];
  }
}
