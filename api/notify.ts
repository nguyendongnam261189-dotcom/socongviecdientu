import * as admin from 'firebase-admin';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Kiểm tra và định dạng lại Key
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;
    let formattedKey = rawKey;

    if (rawKey && !rawKey.includes('BEGIN')) {
      // Nếu là Base64, giải mã
      formattedKey = Buffer.from(rawKey, 'base64').toString('utf8');
    } else if (rawKey) {
      // Nếu là chữ thô, xử lý xuống dòng
      formattedKey = rawKey.replace(/\\n/g, '\n');
    }

    // 2. Khởi tạo Firebase Admin (Chỉ khởi tạo nếu chưa có)
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: formattedKey,
        }),
      });
    }

    // 3. Xử lý logic gửi thông báo (Giả lập code của bạn)
    if (req.method === 'POST') {
      const { token, title, body } = req.body;
      
      if (!token) {
         return res.status(400).json({ error: 'Thiếu token thiết bị' });
      }

      const message = {
        notification: { title, body },
        token: token,
      };

      const response = await admin.messaging().send(message);
      return res.status(200).json({ success: true, messageId: response });
    } else {
      return res.status(405).json({ error: 'Chỉ chấp nhận method POST' });
    }

  } catch (error: any) {
    // ĐÂY LÀ PHẦN QUAN TRỌNG NHẤT: BẮT VÀ IN LỖI RA MÀN HÌNH
    return res.status(500).json({
      error_type: "Lỗi hệ thống Firebase",
      exact_message: error.message, // Thông báo lỗi chi tiết từ Firebase
      environment_check: {
        has_projectId: !!process.env.FIREBASE_PROJECT_ID,
        has_clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        has_privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        key_is_base64: process.env.FIREBASE_PRIVATE_KEY ? !process.env.FIREBASE_PRIVATE_KEY.includes('BEGIN') : false
      }
    });
  }
}
