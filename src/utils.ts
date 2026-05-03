import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Task, User } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// HÀM HỖ TRỢ DÙNG CHUNG: Đảm bảo lấy ra mảng Tổ/Nhóm an toàn từ User
export const getUserDepts = (dept: string | string[] | undefined): string[] => {
  if (!dept) return ['Chưa phân bổ'];
  if (Array.isArray(dept)) return dept.length > 0 ? dept : ['Chưa phân bổ'];
  return [dept];
};

export const isTaskVisible = (task: Task, currentUser: User | null, allUsers?: User[]): boolean => {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  if (task.createdBy === currentUser.id) return true;
  if (task.assignedTo?.includes(currentUser.id)) return true;

  const userDepts = getUserDepts(currentUser.department);

  const matchRole = task.targetRoles?.includes(currentUser.role);
  // NÂNG CẤP: Kiểm tra xem User có thuộc ít nhất 1 Tổ trong danh sách mục tiêu của Task hay không
  const matchDept = task.targetDepartments?.some(targetDept => userDepts.includes(targetDept));
  const matchGrade = task.targetGrades?.includes(currentUser.grade || '');

  return !!(matchRole || matchDept || matchGrade);
};

export const canEditTask = (task: Task, currentUser: User | null, allUsers?: User[]): boolean => {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  
  const userDepts = getUserDepts(currentUser.department);

  if (currentUser.role === 'leader' && userDepts.length > 0) {
    if (task.createdBy === currentUser.id) return true;
    if (allUsers) {
      const creator = allUsers.find(u => u.id === task.createdBy);
      // NÂNG CẤP: Cho phép Tổ trưởng sửa task nếu người tạo task và Tổ trưởng có ít nhất 1 tổ chung
      if (creator) {
        const creatorDepts = getUserDepts(creator.department);
        const hasCommonDept = creatorDepts.some(dept => userDepts.includes(dept));
        if (hasCommonDept) return true;
      }
    }
    return false;
  }

  return task.createdBy === currentUser.id;
};

export const canDeleteTask = (task: Task, currentUser: User | null, allUsers?: User[]): boolean => {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  
  const userDepts = getUserDepts(currentUser.department);

  if (currentUser.role === 'leader' && userDepts.length > 0) {
    if (task.createdBy === currentUser.id) return true;
    if (allUsers) {
      const creator = allUsers.find(u => u.id === task.createdBy);
      // NÂNG CẤP: Quyền xóa cũng áp dụng luật tương tự quyền sửa
      if (creator) {
        const creatorDepts = getUserDepts(creator.department);
        const hasCommonDept = creatorDepts.some(dept => userDepts.includes(dept));
        if (hasCommonDept) return true;
      }
    }
    return false;
  }

  return task.createdBy === currentUser.id;
};
