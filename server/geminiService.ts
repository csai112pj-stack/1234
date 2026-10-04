import { GoogleGenAI } from '@google/genai';

/**
 * 呼叫 Gemini AI 營養師對話
 */
export async function askDietitian(prompt: string, userContext?: any): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;

  if (!apiKey) {
    console.warn('⚠️ 尚未設定 GEMINI_API_KEY 環境變數');
    return '目前系統尚未設定 GEMINI_API_KEY 金鑰。請至 Vercel Dashboard -> Settings -> Environment Variables 設定 GEMINI_API_KEY 變數。';
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `你是一位專業且熱情的健身飲食與營養學專家，名叫 NutriFit AI 營養師。
你的任務是根據使用者的體能數據與目標（增肌/減脂），解答其飲食與營養諮詢問題。
說話語氣請展現專業、親切且具鼓勵性。

使用者當前資料：
${JSON.stringify(userContext || {}, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemPrompt}\n\n使用者提問：${prompt}` }
          ]
        }
      ]
    });

    return response.text || '營養師目前正在整理建議，請稍後再試。';
  } catch (error: any) {
    console.error('❌ Gemini Service 呼叫失敗:', error);

    // 針對常見 API 金鑰失敗提供明確的導引提示
    if (error?.message?.includes('API_KEY_INVALID') || error?.status === 400) {
      return '⚠️ GEMINI_API_KEY 無效或已過期，請於 Vercel 後台檢查並更新 API Key。';
    }

    return `營養師暫時無法連線 (${error?.message || '未知錯誤'})，請稍後再試。`;
  }
}
