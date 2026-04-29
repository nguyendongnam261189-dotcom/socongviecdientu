import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChevronLeft, Plus, Trash2, Upload, Search } from 'lucide-react';
import { cn } from '../../utils';
import { TaskCategory, Role } from '../../types';

interface TaskFormProps {
  onBack: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ onBack }) => {
  const { users, currentUser, addTask, showToast, departments: contextDepartments, grades: contextGrades, documentCategories, gasUrl } = useAppContext();

  const [category, setCategory] = useState<TaskCategory>('task');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  const [targetType, setTargetType] = useState<'all' | 'specific' | 'individual'>('all');
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const [deadline, setDeadline] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [hasDeadline, setHasDeadline] = useState(true);

  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollMultipleChoice, setPollMultipleChoice] = useState(false);

  const [attachments, setAttachments] = useState<{ title: string; url: string; category?: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);

  // 🔥 NEW
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleArrayItem = <T,>(arr: T[], setArr: any, item: T) => {
    setArr((prev: T[]) => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const resolveAssignedUsers = () => {
    if (targetType === 'all') return users.map(u => u.id);
    if (targetType === 'individual') return selectedUsers;

    return users.filter(u => {
      const matchRole = selectedRoles.length === 0 || selectedRoles.includes(u.role);
      const matchDept = selectedDepartments.length === 0 || selectedDepartments.includes(u.department);
      const matchGrade = selectedGrades.length === 0 || selectedGrades.includes(u.grade);
      return matchRole && matchDept && matchGrade;
    }).map(u => u.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    const assignedTo = resolveAssignedUsers();

    if (!title.trim() || assignedTo.length === 0) {
      alert('Vui lòng nhập tiêu đề và đảm bảo có người nhận.');
      return;
    }

    try {
      setIsSubmitting(true);

      const newTaskParams: any = {
        title,
        description,
        status: 'todo',
        category,
        assignedTo,
        visibility,
        createdBy: currentUser?.id || '',
        attachments: attachments.filter(a => a.title && a.url),
      };

      if (hasDeadline) {
        newTaskParams.deadline = new Date(deadline).toISOString();
      }

      await addTask(newTaskParams);

      showToast('Tạo thành công!');

      setTimeout(() => {
        onBack();
      }, 300);

    } catch (error) {
      alert('Lỗi tạo nội dung');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      <button onClick={onBack}>← Quay lại</button>

      <form onSubmit={handleSubmit} className="space-y-4 mt-4">

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Tiêu đề"
          className="border p-2 w-full"
        />

        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Mô tả"
          className="border p-2 w-full"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-black text-white p-3 rounded w-full"
        >
          {isSubmitting ? 'Đang tạo...' : 'Tạo Nội Dung'}
        </button>

      </form>
    </div>
  );
};
