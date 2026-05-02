import * as admin from 'firebase-admin';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Hàm xử lý Private Key: Xóa dấu ngoặc kép thừa (nếu có) và xử lý ký tự ngắt dòng
const formatPrivateKey = (key?: string) => {
  if (!key) return undefined;
  return key.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
};

// Khởi tạo Firebase Admin an toàn
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
      }),
    });
  } catch (error) {
    console.error('Lỗi khởi tạo Firebase Admin:', error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Chỉ chấp nhận POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ép kiểu an toàn: Tránh trường hợp Vercel không tự parse JSON
    const bodyPayload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // Đổi tên biến body thành notificationBody để không trùng lặp
    const { tokens, title, body: notificationBody } = bodyPayload;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: 'Không có tokens nào được gửi lên' });
    }

    if (!title || !notificationBody) {
      return res.status(400).json({ error: 'Thiếu tiêu đề hoặc nội dung thông báo' });
    }

    const message = {
      notification: {
        title: title,
        body: notificationBody,
      },
      tokens: tokens,
    };

    // Thực hiện bắn thông báo
    const response = await admin.messaging().sendEachForMulticast(message);
    
    return res.status(200).json({ success: true, response });
    
  } catch (error: any) {
    console.error('Lỗi khi bắn thông báo đẩy:', error);
    // Trả về chính xác thông báo lỗi của Firebase để dễ dàng bắt bệnh
    return res.status(500).json({ 
      error: 'Lỗi máy chủ nội bộ', 
      detail: error.message || 'Không có chi tiết lỗi' 
    });
  }
}
