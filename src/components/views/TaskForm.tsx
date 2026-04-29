import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChevronLeft, Plus, Trash2, ChevronDown, ChevronRight, FileSpreadsheet, Upload, Search } from 'lucide-react';
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

  // 🔥 CHỈ THÊM DUY NHẤT STATE NÀY
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddAttachment = () => {
    setAttachments(prev => [...prev, { title: '', url: '', category: documentCategories[0] || 'Khác' }]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!gasUrl) {
      alert('Vui lòng cấu hình Web App URL của Google Apps Script trong phần Cài Đặt (Settings) trước khi tải file lên Drive!');
      return;
    }

    setIsUploading(true);
    const fileName = `${Date.now()}_${file.name}`;
    setUploadProgress(prev => ({ ...prev, [fileName]: 10 }));

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = (event.target?.result as string).split(',')[1];
        setUploadProgress(prev => ({ ...prev, [fileName]: 50 }));
        
        try {
          const response = await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
              fileData: base64Data,
            }),
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            }
          });

          const result = await response.json();
          if (result.url) {
            setAttachments(prev => [...prev, { title: file.name, url: result.url, category: documentCategories[0] || 'Khác' }]);
          } else {
            throw new Error(result.error || 'Server không trả về URL');
          }
        } catch (error: any) {
          console.error("Upload fetch error:", error);
          alert('Lỗi lưu Google Drive: ' + error.message);
        } finally {
            setIsUploading(false);
            setUploadProgress(prev => { const n = {...prev}; delete n[fileName]; return n; });
        }
      };
      
      reader.onerror = () => {
        alert('Lỗi đọc nội dung file');
        setIsUploading(false);
        setUploadProgress(prev => { const n = {...prev}; delete n[fileName]; return n; });
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("Reader error:", error);
      alert('Lỗi xử lý file: ' + error.message);
      setIsUploading(false);
      setUploadProgress(prev => { const n = {...prev}; delete n[fileName]; return n; });
    }
  };

  const handleAttachmentChange = (index: number, field: 'title' | 'url' | 'category', value: string) => {
    const newAtts = [...attachments];
    newAtts[index] = { ...newAtts[index], [field]: value };
    setAttachments(newAtts);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddPollOption = () => setPollOptions(prev => [...prev, '']);
  
  const handlePollOptionChange = (idx: number, val: string) => {
    const newOpts = [...pollOptions];
    newOpts[idx] = val;
    setPollOptions(newOpts);
  };
  
  const handleRemovePollOption = (idx: number) => {
    setPollOptions(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleArrayItem = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, item: T) => {
    setArr(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
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

  // 🔥 SỬA DUY NHẤT LOGIC NÀY
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    const assignedTo = resolveAssignedUsers();
    
    if (!title.trim() || assignedTo.length === 0) {
      alert('Vui lòng nhập tiêu đề và đảm bảo có người nhận (đã cấp quyền).');
      return;
    }

    if (category === 'poll') {
      const validOpts = pollOptions.filter(o => o.trim() !== '');
      if (validOpts.length < 2) {
        alert('Khảo sát cần ít nhất 2 lựa chọn.');
        return;
      }
    }
    
    const newTaskParams: any = {
      title,
      description,
      status: 'todo',
      category,
      assignedTo,
      visibility: category === 'task' ? visibility : 'public',
      targetRoles: targetType === 'specific' ? selectedRoles : undefined,
      targetDepartments: targetType === 'specific' ? selectedDepartments : undefined,
      targetGrades: targetType === 'specific' ? selectedGrades : undefined,
      createdBy: currentUser?.id || '',
      attachments: attachments.filter(a => a.title.trim() && a.url.trim()),
    };
    
    if (hasDeadline && deadline && category === 'task') {
      newTaskParams.deadline = new Date(deadline).toISOString();
    }
    
    if (category === 'poll') {
      newTaskParams.pollOptions = pollOptions.filter(o => o.trim() !== '').map((text, idx) => ({ id: `opt-${idx}`, text, votes: [] }));
      newTaskParams.pollMultipleChoice = pollMultipleChoice;
    }

    try {
      setIsSubmitting(true);

      await addTask(newTaskParams);

      showToast('Tạo thành công!');
      onBack();

    } catch (err) {
      console.error(err);
      alert('Tạo nội dung thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const uniqueDepartments = contextDepartments;
  const uniqueGrades = contextGrades;

  const categories: { value: TaskCategory, label: string }[] = [
    { value: 'task', label: 'Công Việc' },
    { value: 'announcement', label: 'Thông Báo' },
    { value: 'poll', label: 'Khảo Sát' },
    { value: 'discussion', label: 'Thảo Luận' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pointer-events-auto">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-slate-800 text-lg">Tạo mới</h2>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <form id="create-task-form" onSubmit={handleSubmit} className="p-4 space-y-6 max-w-2xl mx-auto">

          {/* TOÀN BỘ UI GIỮ NGUYÊN */}

          <div className="pt-4 pb-12">
            <button
              type="submit"
              disabled={isUploading || isSubmitting}
              form="create-task-form"
              className={`w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all ${
                isUploading || isSubmitting
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 hover:translate-y-[-1px] active:translate-y-[1px]'
              }`}
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo Nội Dung Mới'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
