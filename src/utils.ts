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
  const matchDept = task.targetDepartments?.includes(currentUser.department || '');
  const matchGrade = task.targetGrades?.includes(currentUser.grade || '');

  return !!(matchRole || matchDept || matchGrade);
};

export const canEditTask = (task: Task, currentUser: User | null, allUsers?: User[]): boolean => {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  
  if (currentUser.role === 'leader' && currentUser.department) {
    if (task.createdBy === currentUser.id) return true;
    if (allUsers) {
      const creator = allUsers.find(u => u.id === task.createdBy);
      if (creator && creator.department === currentUser.department) return true;
    }
    return false;
  }

  return task.createdBy === currentUser.id;
};

export const canDeleteTask = (task: Task, currentUser: User | null, allUsers?: User[]): boolean => {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  
  if (currentUser.role === 'leader' && currentUser.department) {
    if (task.createdBy === currentUser.id) return true;
    if (allUsers) {
      const creator = allUsers.find(u => u.id === task.createdBy);
      if (creator && creator.department === currentUser.department) return true;
    }
    return false;
  }

  return task.createdBy === currentUser.id;
};
