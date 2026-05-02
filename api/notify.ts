import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Lấy Key từ biến môi trường Vercel
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;
    let formattedKey = rawKey || '';

    // 2. Giải mã Base64 (Nếu Key được lưu dạng mã hóa)
    if (formattedKey && !formattedKey.includes('BEGIN')) {
      formattedKey = Buffer.from(formattedKey, 'base64').toString('utf8');
    }

    // 3. Xử lý định dạng xuống dòng PEM cho Private Key
    if (formattedKey) {
      formattedKey = formattedKey.replace(/\\n/g, '\n');
    }

    // 4. Khởi tạo Firebase Admin (v12 chuẩn)
    try {
      if (getApps().length === 0) {
        initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: formattedKey,
          }),
        });
      }
    } catch (initErr: any) {
      if (initErr.code !== 'app/duplicate-app') {
        throw new Error("Lỗi khởi tạo: " + initErr.message);
      }
    }

    // 5. Xử lý Gửi thông báo khi nhận yêu cầu POST
    if (req.method === 'POST') {
      const { token, title, body } = req.body;
      
      if (!token) {
         return res.status(400).json({ error: 'Thiếu token thiết bị' });
      }

      // ĐÂY LÀ ĐOẠN CODE QUAN TRỌNG ĐỂ HIỆN SỐ 1 ĐỎ TRÊN ICON MÀN HÌNH CHÍNH
      const response = await getMessaging().send({
        notification: {
          title,
          body,
        },
        token: token,
        // Cấu hình cho iPhone (iOS)
        apns: {
          payload: {
            aps: {
              badge: 1, // Hiện số 1 màu đỏ trên icon
              sound: 'default',
            },
          },
        },
        // Cấu hình cho Android
        android: {
          notification: {
            notificationCount: 1, // Hiện số 1 trên các dòng Android hỗ trợ
            sound: 'default',
          },
        },
      });
      
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
