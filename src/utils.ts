import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Task, User } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isTaskVisible = (task: Task, currentUser: User | null, allUsers?: User[]): boolean => {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  if (task.createdBy === currentUser.id) return true;
  if (task.assignedTo?.includes(currentUser.id)) return true;

  const matchRole = task.targetRoles?.includes(currentUser.role);
  
  // So sánh chuẩn: Tổ chuyên môn (Dùng string)
  // Lớp bảo vệ: Nếu lỡ có user lưu department dạng mảng lúc test, ta lấy phần tử đầu tiên
  const userDept = typeof currentUser.department === 'string' 
    ? currentUser.department 
    : (Array.isArray(currentUser.department) ? currentUser.department[0] : '');
    
  const matchDept = task.targetDepartments?.includes(userDept || '');
  const matchGrade = task.targetGrades?.includes(currentUser.grade || '');
  
  // KIỂM TRA MỚI: Người dùng có nằm trong Nhóm kiêm nhiệm nào mà Task nhắm tới không?
  const matchGroup = task.targetGroups?.some(group => currentUser.groups?.includes(group));

  return !!(matchRole || matchDept || matchGrade || matchGroup);
};

export const canEditTask = (task: Task, currentUser: User | null, allUsers?: User[]): boolean => {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  
  const userDept = typeof currentUser.department === 'string' 
    ? currentUser.department 
    : (Array.isArray(currentUser.department) ? currentUser.department[0] : '');

  // Tổ trưởng có quyền sửa nếu người tạo cùng TỔ CHUYÊN MÔN
  if (currentUser.role === 'leader' && userDept) {
    if (task.createdBy === currentUser.id) return true;
    if (allUsers) {
      const creator = allUsers.find(u => u.id === task.createdBy);
      if (creator) {
        const creatorDept = typeof creator.department === 'string' 
          ? creator.department 
          : (Array.isArray(creator.department) ? creator.department[0] : '');
        if (creatorDept === userDept) return true;
      }
    }
    return false;
  }

  return task.createdBy === currentUser.id;
};

export const canDeleteTask = (task: Task, currentUser: User | null, allUsers?: User[]): boolean => {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  
  const userDept = typeof currentUser.department === 'string' 
    ? currentUser.department 
    : (Array.isArray(currentUser.department) ? currentUser.department[0] : '');

  if (currentUser.role === 'leader' && userDept) {
    if (task.createdBy === currentUser.id) return true;
    if (allUsers) {
      const creator = allUsers.find(u => u.id === task.createdBy);
      if (creator) {
        const creatorDept = typeof creator.department === 'string' 
          ? creator.department 
          : (Array.isArray(creator.department) ? creator.department[0] : '');
        if (creatorDept === userDept) return true;
      }
    }
    return false;
  }

  return task.createdBy === currentUser.id;
};
