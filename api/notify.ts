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
      const { tokens, token, title, body } = req.body;
      
      // Hỗ trợ thông minh: Nhận mảng 'tokens' (từ Frontend mới) hoặc chuỗi 'token' (dự phòng)
      let targetTokens: string[] = [];
      if (Array.isArray(tokens) && tokens.length > 0) {
        targetTokens = tokens;
      } else if (typeof token === 'string' && token.trim() !== '') {
        targetTokens = [token];
      }

      if (targetTokens.length === 0) {
         return res.status(400).json({ error: 'Thiếu token thiết bị' });
      }

      // ĐÂY LÀ ĐOẠN CODE ĐÃ ĐƯỢC NÂNG CẤP ĐỂ GỬI MẢNG TOKENS
      const message = {
        notification: {
          title,
          body,
        },
        tokens: targetTokens, // Gửi nguyên mảng thay vì 1 token lẻ
        // Giữ nguyên cấu hình cho iPhone (iOS) của thầy
        apns: {
          payload: {
            aps: {
              badge: 1, // Hiện số 1 màu đỏ trên icon
              sound: 'default',
            },
          },
        },
        // Giữ nguyên cấu hình cho Android của thầy
        android: {
          notification: {
            notificationCount: 1, // Hiện số 1 trên các dòng Android hỗ trợ
            sound: 'default',
          },
        },
      };
      
      // Sử dụng sendEachForMulticast thay cho send
      const response = await getMessaging().sendEachForMulticast(message);
      
      return res.status(200).json({ success: true, response });
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
