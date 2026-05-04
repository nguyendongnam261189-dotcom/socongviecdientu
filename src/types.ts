export type Role = 'admin' | 'leader' | 'teacher';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'invited';

export interface User {
  id: string; // auth UID
  email: string;
  name: string;
  role: Role;
  department: string; 
  grade: string | string[]; 
  status: UserStatus;
  avatar?: string;
  phone?: string;
  fcmTokens?: string[];
  createdAt: string;
}

export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskCategory = 'announcement' | 'poll' | 'discussion' | 'task';

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // User IDs
}

export type UserTaskStatus = 'acknowledged' | 'doing' | 'done';

export interface Submission {
  userId: string;
  status?: UserTaskStatus;
  fileUrl?: string;
  content?: string;
  data?: Record<string, string | number>;
  submittedAt: string;
}

export interface Task {
  id: string;
  category: TaskCategory;
  title: string;
  description: string;
  createdBy: string;
  assignedTo: string[]; // User IDs
  excludedUsers?: string[]; // NÂNG CẤP: Danh sách đen (Người bị loại trừ/Cấm xem)
  targetRoles?: string[];
  targetDepartments?: string[];
  targetGrades?: string[]; 
  deadline?: string; // ISO date string

  status?: TaskStatus;
  visibility?: 'public' | 'private';
  submissions?: Submission[];
  dataCollection?: {
    enabled: boolean;
    fields: { id: string; name: string; type: 'text' | 'number' }[];
  };
  isUrgent?: boolean;
  commentsLocked?: boolean;
  
  readBy?: string[];
  
  pollOptions?: PollOption[];
  pollMultipleChoice?: boolean;
  isLocked?: boolean;

  attachments?: { title: string; url: string; category?: string }[];
  createdAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  parentId: string | null;
  userId: string;
  content: string;
  createdAt: string;
  isPinned?: boolean;
}

export interface Document {
  id: string;
  title: string;
  driveUrl: string;
  targetRole?: Role;
  targetDepartment?: string;
  category?: string;
  createdAt: string;
  createdBy: string;
}

export type TabType = 'dashboard' | 'users' | 'tasks' | 'notifications' | 'documents' | 'settings' | 'statistics';
