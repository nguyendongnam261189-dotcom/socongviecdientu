import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Giải mã Private Key
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;
    let formattedKey = rawKey;

    if (rawKey && !rawKey.includes('BEGIN')) {
      formattedKey = Buffer.from(rawKey, 'base64').toString('utf8');
    } else if (rawKey) {
      formattedKey = rawKey.replace(/\\n/g, '\n');
    }

    // 2. Khởi tạo Firebase bằng cú pháp v12 mới nhất
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: formattedKey,
        }),
      });
    }

    // 3. Gửi thông báo
    if (req.method === 'POST') {
      const { token, title, body } = req.body;
      
      if (!token) {
         return res.status(400).json({ error: 'Thiếu token thiết bị' });
      }

      const message = {
        notification: { title, body },
        token: token,
      };

      const response = await getMessaging().send(message);
      return res.status(200).json({ success: true, messageId: response });
    } else {
      return res.status(405).json({ error: 'Chỉ chấp nhận method POST' });
    }

  } catch (error: any) {
    return res.status(500).json({
      error_type: "Lỗi hệ thống Firebase",
      exact_message: error.message,
      check: "Đã vào khối catch"
    });
  }
}
