# Kiến trúc hệ thống & Database Schema

## 1. Kiến trúc Hệ thống (Architecture)
Hệ thống là một Web App dạng Mobile-first, được thiết kế theo cấu trúc **Client-Serverless** thông qua Firebase:

*   **Frontend:** Viết bằng React (Vite) + Tailwind CSS để tối ưu độ nhẹ và khả năng tương thích cao trên di động (PWA-ready). Giao diện 100% sử dụng icon to (Lucide-react) và ngôn ngữ tiếng Việt đơn giản thay vì tiếng Anh kỹ thuật (Todo/Doing -> Chưa làm/Đang làm).
*   **Backend/BaaS:** Firebase
    *   **Firebase Authentication:** Phân quyền theo email, tự động định danh (Role-based access).
    *   **Cloud Firestore:** Lưu trữ real-time database dưới dạng NoSQL, đảm bảo dữ liệu "Việc của tôi" thay đổi theo thời gian thực (realtime) mà không cần tải lại trang.
*   **Storage (Files):** Liên kết thẳng với Google Drive và thu thập báo cáo qua Google Forms để giảm tải lượng lưu trữ cho app (tôn trọng nguyên tắc 0 đồng) và tận dụng không gian sẵn có của trường. Zalo chỉ dùng để chia sẻ link tới App.

## 2. Firebase Database Schema
Hệ thống NoSQL (Firestore) được thiết kế xoay quanh tính năng Quản lý công việc (Task-based):

### 2.1 Collection: `users`
Lưu trữ thông tin và vai trò của giáo viên, phân cấp thông minh.
```json
{
  "_id": "string (uid)",
  "name": "Nguyễn Văn A",
  "email": "nguyenvana@school.edu.vn",
  "role": "admin | leader | teacher",
  "department": "Toán | Văn | BGH",
  "grade": "Khối 10 | Khối 11 | Khối 12 | All",
  "avatar": "string (url)" // Tùy chọn
}
```

### 2.2 Collection: `tasks`
Gốc của toàn bộ hoạt động. Thiết kế theo thẻ công việc, có đánh dấu status và list hạn chót.
```json
{
  "_id": "string",
  "title": "Nộp giáo án tuần 12",
  "description": "Yêu cầu các thầy cô...",
  "createdBy": "string (user._id)",
  "assignedTo": ["user._id_1", "user._id_2"], // Lọc phía Client/Backend tự điền thông qua Grade/Department
  "deadline": "timestamp",
  "status": "todo | doing | done",
  "attachments": [
    { "title": "Bản mẫu", "url": "https://drive.google.com/..." }
  ],
  "createdAt": "timestamp"
}
```

### 2.3 Collection: `comments`
Hệ thống trao đổi dựa trên ngữ cảnh công việc thay vì Chat Global. (Giải quyết việc trôi tin).
```json
{
  "_id": "string",
  "taskId": "string (task._id)", // Trao đổi bị trói chặt vào 1 Task nhất định
  "userId": "string (user._id)",
  "content": "Tôi đã xem tài liệu...",
  "createdAt": "timestamp"
}
```

### 2.4 Collection: `notifications`
Quy tắc xử lý Announcement, Khảo sát, Feedback.
```json
{
  "_id": "string",
  "type": "announcement | poll | discussion",
  "title": "Nghỉ lễ 2/9",
  "content": "Lịch nghỉ lễ nhà trường...",
  "createdBy": "string (user._id)",
  "readBy": ["user._id_1"], // Xác nhận đã đọc (Giải quyết pain point "Không biết ai đã đọc tin")
  "pollOptions": [ 
    // Dành riêng cho poll
    { "id": "p1", "text": "Phương án 1", "votes": ["user._id_1"] },
    { "id": "p2", "text": "Phương án 2", "votes": [] }
  ],
  "createdAt": "timestamp"
}
```

### 2.5 Collection: `documents`
Thư viện tập trung, không gửi file qua nhóm.
```json
{
  "_id": "string",
  "title": "Cẩm nang giáo viên 2024",
  "driveUrl": "https://drive.google.com/...",
  "targetRole": "teacher | leader | admin | all",
  "createdAt": "timestamp",
  "createdBy": "string (user._id)"
}
```

## 4. Giải pháp Realtime Chat Chi Phí 0 Đồng (Tối ưu Firestore Quotes)
Ứng dụng thực hiện chiến lược giảm thiểu 'document reads' trên Firestore để không vượt qua giới hạn miễn phí Free Tier (50.000 requests/ngày):

- **Không lắng nghe `onSnapshot` cho toàn bộ collection `comments`**. Thay vào đó, app chỉ thực hiện `onSnapshot` (thời gian thực) khi User **click vào bên trong màn hình Chi Tiết của một Công Việc Cụ Thể (Task Detail)**.
- Query được gắn filter chặt chẽ: `where("taskId", "==", selectedTaskId)`.
- Khi user thoát ra khỏi chi tiết công việc hoặc quay lại danh sách quản lý, luồng stream `onSnapshot` sẽ **ngay lập tức bị hủy bỏ (`unsubscribe`)**.
- Bằng cách này, dù có hàng trăm lượt bình luận / trao đổi mỗi ngày, Firestore chỉ tải xuống chính xác data của Task đang mở, duy trì chi phí của trường học luôn ở mức **0 vnđ/tháng** mà vẫn đảm bảo tính năng realtime xuất sắc.
