import { db } from '../server/db.js';

export default async function handler(req: any, res: any) {
  // 設定 CORS Header
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const url = req.url || '';

    // POST /api/user 或 /api/user?
    if (req.method === 'POST' && (url.startsWith('/api/user') || url === '/user')) {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const safeName = String(body.name || '').trim();

      if (!safeName) {
        return res.status(400).json({ success: false, error: '請輸入使用者姓名或暱稱' });
      }

      const user = db.createUser(body);
      const dailySummary = db.getDailySummary(user.id);

      return res.status(200).json({
        success: true,
        user,
        dailySummary
      });
    }

    // GET /api/user
    if (req.method === 'GET' && (url.startsWith('/api/user') || url === '/user')) {
      const userId = req.query?.id as string;
      const user = db.getUser(userId);
      const dailySummary = db.getDailySummary(user.id);

      return res.status(200).json({
        success: true,
        user,
        dailySummary
      });
    }

    return res.status(404).json({ success: false, error: 'Route not found' });
  } catch (err: any) {
    console.error('❌ API Error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Server error occurred'
    });
  }
}
