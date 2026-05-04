import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChevronLeft, Plus, Trash2, Upload, Search, UserMinus, ShieldAlert, Calendar } from 'lucide-react';
import { cn, getUserGrades } from '../../utils';
import { TaskCategory, Role, Task } from '../../types';

const sanitizeFolderName = (str: string) => {
  if (!str) return 'Khac';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") 
    .replace(/đ/g, "d").replace(/Đ/g, "D") 
    .replace(/\s+/g, '_') 
    .replace(/[^a-zA-Z0-9_]/g, ''); 
};

interface TaskFormProps {
  onBack: () => void;
  initialTask?: Task;
}

export const TaskForm: React.FC<TaskFormProps> = ({ onBack, initialTask }) => {
  const { users, currentUser, addTask, editTask, showToast, departments: contextDepartments, grades: contextGrades, documentCategories, gasUrl } = useAppContext();
  
  const freshCurrentUser = useMemo(() => {
    return users.find(u => u.id === currentUser?.id) || currentUser;
  }, [users, currentUser]);

  // CATEGORY & BASIC INFO
  // Đảm bảo nếu sửa task cũ có dạng 'discussion' thì tự chuyển về 'task'
  const [category, setCategory] = useState<TaskCategory>(
    initialTask?.category && initialTask.category !== 'discussion' ? initialTask.category : 'task'
  );
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  
  const [notifyAgain, setNotifyAgain] = useState(false);

  // LUẬT MỚI: Cờ xác định việc này có đánh giá tiến độ chung hay không (Chỉ áp dụng cho Task)
  const [isOfficial, setIsOfficial] = useState(initialTask?.isOfficial !== false); 

  // DEADLINE: Áp dụng cho cả 3 loại (Task, Announcement, Poll)
  const [deadline, setDeadline] = useState(initialTask?.deadline ? new Date(initialTask.deadline).toISOString().slice(0, 16) : new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [hasDeadline, setHasDeadline] = useState(!!initialTask?.deadline || !initialTask);

  // MẪU THU THẬP SỐ LIỆU (Chỉ dành cho Task)
  const [reportTemplateEnabled, setReportTemplateEnabled] = useState(!!initialTask?.reportTemplate);
  const [reportTemplateFields, setReportTemplateFields] = useState<{id: string, label: string, type: 'text' | 'number', required: boolean}[]>(
    (initialTask?.reportTemplate as any) || [ { id: 'field-1', label: 'Nhập số liệu', type: 'number', required: false } ]
  );
  
  // KHẢO SÁT (Chỉ dành cho Poll)
  const [pollOptions, setPollOptions] = useState<string[]>(initialTask?.pollOptions?.map(o => o.text) || ['', '']);
  const [pollMultipleChoice, setPollMultipleChoice] = useState(initialTask?.pollMultipleChoice || false);
  const [allowUserAddOption, setAllowUserAddOption] = useState(initialTask?.allowUserAddOption || false); // THÊM STATE NÀY
  
  // TARGETING
  const [targetType, setTargetType] = useState<'all' | 'specific' | 'individual'>(() => {
    if (initialTask) {
       if (initialTask.assignedTo.length > 0 && initialTask.assignedTo.length < users.length) {
         if (initialTask.targetRoles?.length || initialTask.targetDepartments?.length || initialTask.targetGrades?.length) {
            return 'specific';
         }
         if (initialTask.assignedTo.length > 0) return 'individual';
       }
       if (initialTask.assignedTo.length === 0) return 'specific'; 
       return 'all';
    }
    return 'all';
  });
  
  const [selectedRoles, setSelectedRoles] = useState<Role[]>((initialTask?.targetRoles as Role[]) || []);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(initialTask?.targetDepartments || []);
  const [selectedGrades, setSelectedGrades] = useState<string[]>(initialTask?.targetGrades || []); 
  const [selectedUsers, setSelectedUsers] = useState<string[]>(initialTask?.assignedTo || []);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  const [excludedUsers, setExcludedUsers] = useState<string[]>(initialTask?.excludedUsers || []);
  const [excludeMe, setExcludeMe] = useState(false);
  const [showExclusionList, setShowExclusionList] = useState(false);
  
  // ATTACHMENTS
  const [attachments, setAttachments] = useState<{ title: string; url: string; category?: string }[]>(initialTask?.attachments || []);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>(documentCategories[0] || 'Khác');

  const allSystemGrades = Array.from(new Set([...contextGrades, ...users.flatMap(u => getUserGrades(u.grade))])).filter(Boolean).sort();
  
  const availableDepartments = useMemo(() => {
    if (freshCurrentUser?.role === 'admin') return contextDepartments;
    const myDept = typeof freshCurrentUser?.department === 'string' ? freshCurrentUser.department : (Array.isArray(freshCurrentUser?.department) ? freshCurrentUser.department[0] : '');
    return myDept && myDept !== 'Khác' && myDept.trim() !== '' ? [myDept] : [];
  }, [freshCurrentUser, contextDepartments]);

  const availableGrades = useMemo(() => {
    if (freshCurrentUser?.role === 'admin') return allSystemGrades;
    return getUserGrades(freshCurrentUser?.grade).filter(g => g && g.trim() !== '');
  }, [freshCurrentUser, allSystemGrades]);

  const availableUsers = useMemo(() => {
    if (freshCurrentUser?.role === 'admin') return users;
    const myDept = typeof freshCurrentUser?.department === 'string' ? freshCurrentUser.department : '';
    const myGrades = getUserGrades(freshCurrentUser?.grade).filter(g => g && g.trim() !== '');
    
    return users.filter(u => {
      const uDept = typeof u.department === 'string' ? u.department : '';
      const uGrades = getUserGrades(u.grade).filter(g => g && g.trim() !== '');
      const isSameDept = myDept && uDept === myDept;
      const isSameGrade = uGrades.some(g => myGrades.includes(g));
      return isSameDept || isSameGrade;
    });
  }, [freshCurrentUser, users]);

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
          const safeGroupName = sanitizeFolderName(uploadCategory);
          const currentYear = new Date().getFullYear();
          const currentMonth = new Date().getMonth() + 1;
          const formattedMonth = currentMonth < 10 ? `0${currentMonth}` : currentMonth.toString();
          const folderPath = `QuanLyTruongHoc/Nam_${currentYear}/${safeGroupName}/Thang_${formattedMonth}`;
          
          const response = await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
              fileData: base64Data,
              folderPath: folderPath
            }),
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            }
          });

          const result = await response.json();
          if (result.url) {
            setAttachments(prev => [...prev, { title: file.name, url: result.url, category: uploadCategory }]);
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
      
      reader.readAsDataURL(file);
    } catch (error: any) {
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

  const rawAssignedUsers = useMemo(() => {
    if (targetType === 'all') return availableUsers; 
    if (targetType === 'individual') return users.filter(u => selectedUsers.includes(u.id));
    if (selectedRoles.length === 0 && selectedDepartments.length === 0 && selectedGrades.length === 0) return [];

    return users.filter(u => {
      const uGrades = getUserGrades(u.grade).filter(g => g && g.trim() !== '');
      const uDept = typeof u.department === 'string' ? u.department : (Array.isArray(u.department) ? u.department[0] : 'Khác');
      
      const matchRole = selectedRoles.length > 0 && selectedRoles.includes(u.role);
      const matchDept = selectedDepartments.length > 0 && selectedDepartments.includes(uDept || '');
      const matchGrade = selectedGrades.length > 0 && selectedGrades.some(g => uGrades.includes(g));
      
      return matchRole || matchDept || matchGrade;
    });
  }, [targetType, users, availableUsers, selectedRoles, selectedDepartments, selectedGrades, selectedUsers]);

  const toggleExcludeUser = (uid: string) => {
    setExcludedUsers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalExcluded = [...excludedUsers];
    if (excludeMe && freshCurrentUser && !finalExcluded.includes(freshCurrentUser.id)) {
        finalExcluded.push(freshCurrentUser.id);
    }
    
    const finalAssignedTo = rawAssignedUsers.filter(u => !finalExcluded.includes(u.id)).map(u => u.id);
    
    if (!title.trim() || finalAssignedTo.length === 0) {
      alert('Vui lòng nhập tiêu đề và đảm bảo có ít nhất 1 người nhận sau khi đã loại trừ.');
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
      assignedTo: finalAssignedTo,
      excludedUsers: finalExcluded,
      visibility: 'private', 
      // Ép kiểu: Chỉ có Công việc (task) mới được tính vào Đánh giá tiến độ
      isOfficial: category === 'task' ? isOfficial : false, 
      createdBy: freshCurrentUser?.id || '',
      attachments: attachments.filter(a => a.title.trim() && a.url.trim()),
    };

    if (targetType === 'specific') {
      newTaskParams.targetRoles = selectedRoles;
      newTaskParams.targetDepartments = selectedDepartments;
      newTaskParams.targetGrades = selectedGrades;
    } else {
      newTaskParams.targetRoles = [];
      newTaskParams.targetDepartments = [];
      newTaskParams.targetGrades = [];
    }
    
    if (hasDeadline && deadline) {
      newTaskParams.deadline = new Date(deadline).toISOString();
    }
    
    // Lưu Report Template (Chỉ nếu là task)
    if (category === 'task') {
      if (reportTemplateEnabled) {
        const validFields = reportTemplateFields.filter(f => f.label.trim() !== '');
        if (validFields.length > 0) {
          newTaskParams.reportTemplate = validFields;
        }
      }
    }
    
    // Lưu Poll (Chỉ nếu là Poll)
    if (category === 'poll') {
      newTaskParams.pollOptions = pollOptions.filter(o => o.trim() !== '').map((text, idx) => ({ id: `opt-${idx}`, text, votes: [] }));
      newTaskParams.pollMultipleChoice = pollMultipleChoice;
      newTaskParams.allowUserAddOption = allowUserAddOption; // LƯU CỜ THÊM LỰA CHỌN
    }

    if (initialTask) {
      editTask(initialTask.id, newTaskParams, notifyAgain);
      showToast('Cập nhật thành công!');
    } else {
      addTask(newTaskParams);
      showToast('Tạo thành công!');
    }
    
   // --- ĐOẠN CODE GỬI THÔNG BÁO XỊN SÒ MỚI ---
    try {
      const targetedUsers = users.filter(u => finalAssignedTo.includes(u.id));
      const validTokens: string[] = [];
      targetedUsers.forEach((u: any) => {
        if (u.fcmTokens && Array.isArray(u.fcmTokens)) validTokens.push(...u.fcmTokens);
        else if (typeof u.fcmTokens === 'string') validTokens.push(u.fcmTokens);
      });
      const uniqueTokens = Array.from(new Set(validTokens)).filter(t => t);

      if (uniqueTokens.length > 0) {
        const typePrefix = category === 'announcement' ? '📢 THÔNG BÁO' : category === 'poll' ? '📊 KHẢO SÁT' : '📝 CÔNG VIỆC';
        const notifyTitle = initialTask ? `🔄 ĐÃ CẬP NHẬT: ${title}` : `${typePrefix}: ${title}`;
        const notifyBody = initialTask 
  ? `Giao bởi: ${freshCurrentUser?.name || 'Ban Quản trị'}\n⚠️ NỘI DUNG ĐÃ THAY ĐỔI. Vui lòng xem lại thông tin mới nhất!`
  : `Giao bởi: ${freshCurrentUser?.name || 'Ban Quản trị'}\n${description ? description.substring(0, 60) + '...' : 'Nhấn vào để xem chi tiết ngay.'}`;

        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokens: uniqueTokens,
            title: notifyTitle,
            body: notifyBody
          })
        }).catch(err => console.error("Lỗi gửi notify:", err));
      }
    } catch (error) {
      console.error('Lỗi khi kích hoạt thông báo:', error);
    }
    // ------------------------------------------

    onBack();
  };

  const categories: { value: TaskCategory, label: string }[] = [
    { value: 'task', label: 'Công Việc' },
    { value: 'announcement', label: 'Thông Báo' },
    { value: 'poll', label: 'Khảo Sát' }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pointer-events-auto">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-slate-800 text-lg">{initialTask ? 'Chỉnh sửa' : 'Tạo mới'}</h2>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <form id="create-task-form" onSubmit={handleSubmit} className="p-4 space-y-6 max-w-2xl mx-auto">
          
          {initialTask && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <label className="flex items-center gap-2 text-sm font-semibold text-amber-900 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={notifyAgain}
                  onChange={e => setNotifyAgain(e.target.checked)}
                  className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                Thông báo lại cho người nhận (đánh dấu chưa đọc)
              </label>
            </div>
          )}

          {/* Phân loại (Category) - Chỉ còn 3 Tab */}
          <div className="flex bg-slate-200/60 p-1.5 rounded-2xl gap-1.5 shadow-inner">
            {categories.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                  category === cat.value 
                    ? "bg-white text-indigo-700 shadow-sm" 
                    : "text-slate-500 hover:bg-white/50"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            {/* Tiêu đề & Nội dung */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Tiêu đề *</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all placeholder:font-normal"
                placeholder="Nhập tiêu đề..."
              />
            </div>
            
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Nội dung chi tiết</label>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all resize-none"
                placeholder={category === 'task' ? "Nhập chi tiết nhiệm vụ (Hoặc dán Link Google Drive/Form để thu bài tại đây)..." : "Nhập nội dung chi tiết..."}
              />
            </div>

            {/* DEADLINE (CHO CẢ 3 LOẠI) */}
            <div className="pt-2 border-t border-slate-100 mt-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer mb-2">
                <input 
                  type="checkbox" 
                  checked={hasDeadline} 
                  onChange={e => setHasDeadline(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-300"
                />
                {category === 'announcement' ? 'Có thời hạn (Ngày diễn ra/Hạn xem)' : 'Có thời hạn (Deadline)'}
              </label>
              {hasDeadline && (
                <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus-within:border-indigo-400 transition-colors">
                  <Calendar className="w-4 h-4 text-indigo-500 ml-1" />
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="flex-1 bg-transparent text-slate-800 text-sm font-bold focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* MẪU THU THẬP & ĐÁNH GIÁ TIẾN ĐỘ (CHỈ DÀNH CHO CÔNG VIỆC) */}
            {category === 'task' && (
              <>
                <div className="pt-4 border-t border-slate-100 mt-2 space-y-4">
                 <div>
                   <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2 cursor-pointer">
                     <input 
                       type="checkbox" 
                       checked={reportTemplateEnabled} 
                       onChange={e => setReportTemplateEnabled(e.target.checked)}
                       className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-300"
                     />
                     Tạo mẫu thu thập dữ liệu nhanh
                   </label>
                   {reportTemplateEnabled && (
                     <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
                       <p className="text-[11px] text-slate-400 mb-2 font-medium">Định nghĩa các cột dữ liệu người nhận cần điền. Hệ thống sẽ tự tạo bảng nhập liệu cho họ và tổng hợp tự động.</p>
                       {reportTemplateFields.map((field, idx) => (
                         <div key={field.id} className="flex gap-2 items-center">
                           <input
                             type="text"
                             value={field.label}
                             onChange={e => {
                               const newFields = [...reportTemplateFields];
                               newFields[idx].label = e.target.value;
                               setReportTemplateFields(newFields);
                             }}
                             placeholder="Tên trường (VD: Sĩ số, Ghi chú)"
                             className="flex-1 p-2 bg-white border border-slate-300 rounded text-sm outline-none focus:border-indigo-400 shadow-sm"
                           />
                           {/* Đã xóa <option value="file"> */}
                           <select 
                             value={field.type}
                             onChange={e => {
                               const newFields = [...reportTemplateFields];
                               newFields[idx].type = e.target.value as 'text' | 'number';
                               setReportTemplateFields(newFields);
                             }}
                             className="p-2 bg-white border border-slate-300 rounded text-sm outline-none shadow-sm"
                           >
                             <option value="text">Chữ (Text)</option>
                             <option value="number">Số (Number)</option>
                           </select>
                           <label className="flex items-center gap-1 text-xs text-slate-600">
                             <input 
                               type="checkbox" 
                               checked={field.required}
                               onChange={e => {
                                 const newFields = [...reportTemplateFields];
                                 newFields[idx].required = e.target.checked;
                                 setReportTemplateFields(newFields);
                               }}
                             /> Bắt buộc
                           </label>
                           <button type="button" onClick={() => {
                             setReportTemplateFields(prev => prev.filter((_, i) => i !== idx));
                           }} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                       ))}
                       <button
                         type="button"
                         onClick={() => setReportTemplateFields(prev => [...prev, { id: `field-${Date.now()}`, label: '', type: 'text', required: false }])}
                         className="flex items-center gap-1 text-indigo-600 text-xs font-bold mt-2 hover:text-indigo-800 transition-colors"
                       >
                         <Plus className="w-4 h-4"/> Thêm cột
                       </button>
                     </div>
                   )}
                 </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4">
                  <label className={cn("flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors", isOfficial ? "bg-indigo-50/50 border-indigo-200 hover:bg-indigo-50" : "bg-slate-50 border-slate-200 hover:bg-slate-100")}>
                    <input 
                      type="checkbox" 
                      checked={isOfficial} 
                      onChange={e => setIsOfficial(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-300"
                    />
                    <div>
                      <div className={cn("text-sm font-bold", isOfficial ? "text-indigo-900" : "text-slate-700")}>Có đánh giá tiến độ</div>
                      <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        <b className={isOfficial ? "text-indigo-600" : ""}>Đang Bật:</b> Hiện trên bảng Thống kê chung của trường.<br/>
                        <b>Tắt:</b> Việc nội bộ. Ai nhận việc nấy thấy (Admin/BGH không thấy).
                      </div>
                    </div>
                  </label>
                </div>
              </>
            )}

          </div>

          {/* KHẢO SÁT FIELDS (CHỈ POLL) */}
          {category === 'poll' && (
            <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Các lựa chọn khảo sát</label>
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={e => handlePollOptionChange(idx, e.target.value)}
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all shadow-sm"
                    placeholder={`Lựa chọn ${idx + 1}`}
                  />
                  <button type="button" onClick={() => handleRemovePollOption(idx)} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddPollOption}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-indigo-200 text-sm font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-colors mt-2"
              >
                <Plus className="w-4 h-4" /> Thêm lựa chọn
              </button>
              
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">Cho phép chọn nhiều phương án</span>
                <button
                  type="button"
                  onClick={() => setPollMultipleChoice(!pollMultipleChoice)}
                  className={cn(
                    "w-11 h-6 rounded-full transition-colors relative",
                    pollMultipleChoice ? "bg-indigo-500" : "bg-slate-200"
                  )}
                >
                  <span className={cn(
                    "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm",
                    pollMultipleChoice ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>

              {/* TÍNH NĂNG MỚI: CHO PHÉP NGƯỜI THAM GIA THÊM LỰA CHỌN */}
              <div className="mt-2 pt-4 border-t flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">Người tham gia được thêm lựa chọn</span>
                <button
                  type="button"
                  onClick={() => setAllowUserAddOption(!allowUserAddOption)}
                  className={cn(
                    "w-11 h-6 rounded-full transition-colors relative",
                    allowUserAddOption ? "bg-emerald-500" : "bg-slate-200"
                  )}
                >
                  <span className={cn(
                    "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm",
                    allowUserAddOption ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>
            </div>
          )}

          {/* TARGETING SPECIFIC USERS */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
             <div className="flex items-center justify-between">
               <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Người nhận</label>
                <select
                   value={targetType}
                   onChange={e => setTargetType(e.target.value as 'all' | 'specific' | 'individual')}
                   className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-indigo-600 text-sm font-bold outline-none"
                 >
                   {freshCurrentUser?.role === 'admin' && <option value="all">Tất cả mọi người</option>}
                   <option value="specific">Chỉ định theo Tổ/Nhóm</option>
                   <option value="individual">Chọn từng cá nhân</option>
                 </select>
             </div>
             
             {targetType === 'specific' && (
               <div className="space-y-4 pt-2 border-t border-slate-100">
                 {/* Roles - BGH only */}
                 {freshCurrentUser?.role === 'admin' && (
                   <div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Theo chức vụ</span>
                     <div className="flex flex-wrap gap-2">
                       {(['admin', 'leader', 'teacher'] as Role[]).map(role => (
                         <button
                           key={role}
                           type="button"
                           onClick={() => toggleArrayItem(selectedRoles, setSelectedRoles, role)}
                           className={cn("px-4 py-2 rounded-full text-xs font-bold transition-all border shadow-sm", selectedRoles.includes(role) ? "bg-indigo-100 border-indigo-200 text-indigo-700" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100")}
                         >
                           {role === 'admin' ? 'BGH' : role === 'leader' ? 'Tổ trưởng' : 'Giáo viên'}
                         </button>
                       ))}
                     </div>
                   </div>
                 )}
                 
                 {/* Departments */}
                 {availableDepartments.length > 0 && (
                   <div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Theo tổ chuyên môn</span>
                     <div className="flex flex-wrap gap-2">
                       {availableDepartments.map(dept => (
                         <button
                           key={dept}
                           type="button"
                           onClick={() => toggleArrayItem(selectedDepartments, setSelectedDepartments, dept)}
                           className={cn("px-4 py-2 rounded-full text-xs font-bold transition-all border shadow-sm", selectedDepartments.includes(dept) ? "bg-amber-100 border-amber-200 text-amber-800" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100")}
                         >
                           {dept}
                         </button>
                       ))}
                     </div>
                   </div>
                 )}
                 
                 {/* Khối / Nhóm kiêm nhiệm */}
                 {availableGrades.length > 0 && (
                   <div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Theo khối / nhóm kiêm nhiệm</span>
                     <div className="flex flex-wrap gap-2">
                       {availableGrades.map(grade => (
                         <button
                           key={grade}
                           type="button"
                           onClick={() => toggleArrayItem(selectedGrades, setSelectedGrades, grade)}
                           className={cn("px-4 py-2 rounded-full text-xs font-bold transition-all border shadow-sm", selectedGrades.includes(grade) ? "bg-emerald-100 border-emerald-200 text-emerald-800" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100")}
                         >
                           {grade}
                         </button>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* CẢNH BÁO NẾU LEADER KHÔNG CÓ NHÓM */}
                 {freshCurrentUser?.role !== 'admin' && availableDepartments.length === 0 && availableGrades.length === 0 && (
                    <div className="text-center p-4 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                      <p className="text-xs text-rose-600 font-medium text-left">Tài khoản chưa được phân bổ vào Tổ/Nhóm nào. Hãy báo Admin.</p>
                    </div>
                 )}
               </div>
             )}

             {targetType === 'individual' && (
               <div className="space-y-4 pt-2 border-t border-slate-100">
                 <div className="relative">
                   <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input
                     type="text"
                     value={userSearchQuery}
                     onChange={e => setUserSearchQuery(e.target.value)}
                     placeholder="Tìm kiếm theo tên, tổ, nhóm..."
                     className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                   />
                 </div>
                 <div className="max-h-[300px] overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2 bg-slate-50 shadow-inner">
                   {availableUsers.filter(u => {
                     const uGrades = getUserGrades(u.grade).filter(g => g && g.trim() !== '');
                     return u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                     (u.department && u.department.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
                     uGrades.some(g => g.toLowerCase().includes(userSearchQuery.toLowerCase()))
                   }).map(u => {
                     const uGrades = getUserGrades(u.grade).filter(g => g && g.trim() !== '');
                     return (
                     <label key={u.id} className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer border border-transparent hover:border-indigo-100 transition-colors shadow-sm">
                       <input 
                         type="checkbox" 
                         checked={selectedUsers.includes(u.id)}
                         onChange={e => toggleArrayItem(selectedUsers, setSelectedUsers, u.id)}
                         className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-300"
                       />
                       <div className="flex-1 min-w-0">
                         <div className="text-sm font-bold text-slate-800 truncate">{u.name}</div>
                         <div className="text-[10px] text-slate-500 truncate mt-0.5">
                           {u.department || 'Chưa phân bổ'}
                           <span className="text-emerald-600 font-medium">
                             {' • ' + (uGrades.length > 0 ? uGrades.join(', ') : 'Chưa phân công')}
                           </span>
                         </div>
                       </div>
                     </label>
                   )})}
                   {availableUsers.filter(u => {
                     const uGrades = getUserGrades(u.grade).filter(g => g && g.trim() !== '');
                     return u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                     (u.department && u.department.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
                     uGrades.some(g => g.toLowerCase().includes(userSearchQuery.toLowerCase()))
                   }).length === 0 && (
                     <div className="text-center text-slate-400 text-sm py-6">
                       Không có kết quả nào.
                     </div>
                   )}
                 </div>
               </div>
             )}

             {/* DANH SÁCH LOẠI TRỪ (BLACKLIST) */}
             {(targetType === 'all' || targetType === 'specific') && (
                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 mt-2">
                  <div className="flex justify-between items-center">
                     <span className="text-indigo-800 text-xs">
                       Sẽ gửi đến: <b>{rawAssignedUsers.filter(u => !excludedUsers.includes(u.id)).length}</b> người nhận.
                     </span>
                     <button 
                       type="button" 
                       onClick={() => setShowExclusionList(!showExclusionList)} 
                       className="text-xs font-bold text-indigo-700 hover:text-indigo-900 transition-colors flex items-center gap-1"
                     >
                        <UserMinus className="w-3 h-3" />
                        {showExclusionList ? 'Thu gọn' : 'Xem & Loại trừ'}
                     </button>
                  </div>
                  
                  {showExclusionList && (
                     <div className="mt-3 bg-white border border-indigo-100 rounded-lg max-h-48 overflow-y-auto p-1 divide-y divide-slate-50 shadow-inner">
                        {rawAssignedUsers.map(u => (
                           <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer rounded-md transition-colors">
                              <input 
                                 type="checkbox" 
                                 checked={!excludedUsers.includes(u.id)}
                                 onChange={() => toggleExcludeUser(u.id)}
                                 className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-300"
                              />
                              <div className="flex-1 min-w-0">
                                <div className={cn("text-xs font-medium truncate transition-colors", excludedUsers.includes(u.id) ? "text-slate-400 line-through" : "text-slate-700")}>{u.name}</div>
                                <div className="text-[10px] text-slate-400 truncate">{typeof u.department === 'string' ? u.department : 'Khác'}</div>
                              </div>
                           </label>
                        ))}
                     </div>
                  )}
                  {showExclusionList && excludedUsers.length > 0 && (
                     <div className="mt-2 text-[10px] text-rose-600 font-medium flex items-center gap-1">
                        <Trash2 className="w-3 h-3" />
                        Đã loại trừ {excludedUsers.filter(id => rawAssignedUsers.some(u => u.id === id)).length} người.
                     </div>
                  )}
                </div>
             )}

             {/* NÚT LOẠI TRỪ TÔI */}
             <div className="pt-2 border-t border-slate-100">
               <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100">
                 <input 
                   type="checkbox" 
                   checked={excludeMe} 
                   onChange={e => setExcludeMe(e.target.checked)} 
                   className="rounded text-rose-500 focus:ring-rose-500 w-4 h-4 border-slate-300" 
                 />
                 <span className="text-xs font-bold text-slate-600">Loại trừ tôi khỏi danh sách nhận việc (Tôi chỉ tạo việc)</span>
               </label>
             </div>
          </div>

          {/* ATTACHMENTS */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
             <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tệp & Tài liệu đính kèm</label>
             {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate mb-0.5">{att.title}</p>
                    <span className="text-[9px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-bold">{att.category || 'Khác'}</span>
                  </div>
                  <button type="button" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="p-2 bg-white rounded-lg text-rose-500 hover:bg-rose-50 border border-slate-200 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="text-xs font-bold text-indigo-600 bg-indigo-50 p-2.5 rounded-xl border border-indigo-100 flex justify-between items-center shadow-sm">
                  <span className="truncate pr-2">Đang tải: {fileName}</span>
                  <span>{progress}%</span>
                </div>
              ))}

              <div className="flex flex-col sm:flex-row gap-2">
                <select 
                  value={uploadCategory} 
                  onChange={e => setUploadCategory(e.target.value)} 
                  className="text-xs font-bold bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-400 transition-colors"
                >
                  {documentCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <label className={cn("flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 text-xs font-bold transition-all", isUploading ? "text-slate-400 bg-slate-50 cursor-not-allowed" : "text-indigo-600 bg-white hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer shadow-sm")}>
                  <Upload className="w-4 h-4" /> {isUploading ? 'Đang xử lý...' : 'Tải tài liệu lên'}
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>
              </div>
          </div>

          <div className="pt-4 pb-12">
            <button
              type="submit"
              disabled={isUploading}
              form="create-task-form"
              className={`w-full text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 active:scale-[0.98]'}`}
            >
              {initialTask ? 'LƯU THAY ĐỔI' : 'TẠO NỘI DUNG MỚI'}
            </button>
          </div>
          
        </form>
      </div>
    </div>
  );
};
