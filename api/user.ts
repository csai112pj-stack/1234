import type { VercelRequest, VercelResponse } from '@vercel/node';

let usersStore: any[] = [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. 取得所有使用者
    if (req.method === 'GET') {
      return res.status(200).json({ success: true, users: usersStore });
    }

    // 2. 新增或更新使用者 (含完整欄位備份，避免白屏)
    if (req.method === 'POST') {
      const userData = req.body || {};
      const user = {
        id: userData.id || `user_${Date.now()}`,
        name: userData.name || '使用者',
        gender: userData.gender || 'male',
        age: Number(userData.age) || 25,
        height: Number(userData.height) || 175,
        weight: Number(userData.weight) || 70,
        body_fat_rate: userData.body_fat_rate ? Number(userData.body_fat_rate) : undefined,
        goal: userData.goal || 'fat_loss',
        activity_level: userData.activity_level || 'moderate',
        pin: userData.pin || '',
        bmr: Number(userData.bmr) || 1600,
        tdee: Number(userData.tdee) || 2200,
        target_calories: Number(userData.target_calories) || 1800,
        target_protein: Number(userData.target_protein) || 135,
        target_carbs: Number(userData.target_carbs) || 180,
        target_fat: Number(userData.target_fat) || 60,
        created_at: new Date().toISOString(),
      };

      const existingIndex = usersStore.findIndex((u) => u.id === user.id);
      if (existingIndex >= 0) {
        usersStore[existingIndex] = user;
      } else {
        usersStore.push(user);
      }

      return res.status(200).json({ success: true, user });
    }

    // 3. 刪除使用者 (解決 Route not found)
    if (req.method === 'DELETE') {
      const userId = (req.query.id as string) || req.body?.id;
      usersStore = usersStore.filter((u) => u.id !== userId);
      return res.status(200).json({ success: true, message: '刪除成功', deletedId: userId });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
