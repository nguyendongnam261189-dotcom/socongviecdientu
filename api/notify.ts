import * as admin from 'firebase-admin';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Lấy Key từ Vercel
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;
    let formattedKey = rawKey || '';

    // 2. Giải mã Base64 (Nếu Key không chứa chữ BEGIN)
    if (formattedKey && !formattedKey.includes('BEGIN')) {
      formattedKey = Buffer.from(formattedKey, 'base64').toString('utf8');
    }

    // 3. QUAN TRỌNG NHẤT: Ép tất cả các chữ \n thành dấu xuống dòng thật sự
    if (formattedKey) {
      formattedKey = formattedKey.replace(/\\n/g, '\n');
    }

    // 4. Khởi tạo Firebase cực kỳ an toàn
    try {
      if (!admin.apps || admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: formattedKey,
          }),
        });
      }
    } catch (initErr: any) {
      if (initErr.code !== 'app/duplicate-app') {
        throw new Error("Lỗi lúc khởi tạo Firebase: " + initErr.message);
      }
    }

    // 5. Xử lý Gửi thông báo
    if (req.method === 'POST') {
      const { token, title, body } = req.body;
      
      if (!token) {
         return res.status(400).json({ error: 'Thiếu token thiết bị' });
      }

      const response = await admin.messaging().send({
        notification: { title, body },
        token: token,
      });
      
      // THÀNH CÔNG RỒI!
      return res.status(200).json({ success: true, messageId: response });
    } else {
      return res.status(405).json({ error: 'Chỉ chấp nhận method POST' });
    }

  } catch (error: any) {
    return res.status(500).json({
      error_type: "Lỗi hệ thống Firebase",
      exact_message: error.message
    });
  }
}
