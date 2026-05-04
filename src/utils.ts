import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Task, User } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// HÀM HỖ TRỢ: Đảm bảo lấy mảng Khối/Nhóm kiêm nhiệm một cách an toàn
export const getUserGrades = (grade: string | string[] | undefined): string[] => {
  if (!grade) return [];
  if (Array.isArray(grade)) return grade;
  return [grade];
};

export const isTaskVisible = (task: Task, currentUser: User | null, allUsers?: User[]): boolean => {
  if (!currentUser) return false;
  
  // BLACKLIST NÂNG CẤP: Chặn tuyệt đối người nằm trong danh sách loại trừ (Xử lý các vấn đề tế nhị)
  if (task.excludedUsers?.includes(currentUser.id)) return false;

  if (currentUser.role === 'admin') return true;
  if (task.createdBy === currentUser.id) return true;
  if (task.assignedTo?.includes(currentUser.id)) return true;

  const userDept = typeof currentUser.department === 'string' 
    ? currentUser.department 
    : (Array.isArray(currentUser.department) ? currentUser.department[0] : '');

  const userGrades = getUserGrades(currentUser.grade);

  const matchRole = task.targetRoles?.includes(currentUser.role);
  const matchDept = task.targetDepartments?.includes(userDept || '');
  const matchGrade = task.targetGrades?.some(g => userGrades.includes(g));

  return !!(matchRole || matchDept || matchGrade);
};

export const canEditTask = (task: Task, currentUser: User | null, allUsers?: User[]): boolean => {
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
