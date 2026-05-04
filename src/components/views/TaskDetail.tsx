import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, Send, Paperclip, CheckCircle2, Circle, Clock, Trash2, FileText, Download, Lock, Unlock, MessageSquareReply, Edit2, X, Search, BellRing, Archive, ArchiveRestore } from 'lucide-react';
import { Task } from '../../types';
import { cn, canDeleteTask, canEditTask, getUserGrades } from '../../utils';
import * as XLSX from 'xlsx';

import { TaskForm } from './TaskForm';

interface TaskDetailProps {
  task: Task;
  onBack: () => void;
  isManagerView?: boolean; 
}

const FilePreview: React.FC<{ title: string, url: string }> = ({ title, url }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(title) || url.startsWith('data:image/');
  
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const fileId = driveMatch ? driveMatch[1] : null;
  const embedUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
  const downloadUrl = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : url;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(downloadUrl, '_blank');
  };

  return (
    <>
      <div className="flex gap-2 w-full mt-2">
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
          className="flex items-center gap-3 p-3 flex-1 rounded-xl border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition-all cursor-pointer text-sm shadow-sm group bg-white text-left"
        >
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            {isImage ? <FileText className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-700 truncate">{title}</p>
            <p className="text-[10px] text-slate-400 font-medium">Bấm để xem nhanh</p>
          </div>
        </button>

        <button 
          type="button"
          onClick={handleDownload}
          className="p-3 bg-slate-100 text-slate-600 rounded-xl border border-slate-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm"
          title="Tải về máy"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-200"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
        >
          <div 
            className="bg-white w-full max-w-4xl h-[85dvh] rounded-2xl flex flex-col shadow-2xl overflow-hidden relative"
            onClick={(e) => e.stopPropagation()} 
          >
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-100 bg-white shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-800 truncate pr-4 flex-1">{title}</h3>
              <div className="flex gap-2 shrink-0 items-center">
                <button 
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Tải xuống
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} 
                  className="p-2 text-slate-400 hover:text-rose-500 bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-100 relative overflow-hidden">
              {isImage ? (
                <img 
                  src={fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200` : url} 
                  alt={title} 
                  className="w-full h-full object-contain p-2" 
                />
              ) : (
                <iframe 
                  src={embedUrl} 
                  className="w-full h-full border-0" 
                  title="Preview"
                  loading="lazy"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const TaskDetail: React.FC<TaskDetailProps> = ({ task, onBack, isManagerView = false }) => {
  const { comments, users, currentUser, addComment, updateTaskStatus, deleteTask, submitReport, showToast, markTaskRead, gasUrl } = useAppContext();
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadProgressState, setUploadProgressState] = useState('');
  
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  useEffect(() => {
    markTaskRead(task.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  
  const myExistingReport = task.submissions?.find(r => r.userId === currentUser?.id);
  const [reportContent, setReportContent] = useState(myExistingReport?.content || '');
  const [reportUrl, setReportUrl] = useState(myExistingReport?.fileUrl || '');
  const [reportData, setReportData] = useState<Record<string, string | number>>(() => {
    if (myExistingReport?.data) return myExistingReport.data;
    if (!currentUser || !task.reportPrefill) return {};
    return task.reportPrefill[currentUser.id] || {};
  });
  const [isEditingReport, setIsEditingReport] = useState(false);

  const getIsPrefilled = (fieldId: string) => {
    if (!currentUser || !task.reportPrefill || !task.reportPrefill[currentUser.id]) return false;
    const val = task.reportPrefill[currentUser.id][fieldId];
    return val !== undefined && val !== '';
  };

  const taskComments = comments.filter(c => c.taskId === task.id);
  const author = users.find(u => u.id === task.createdBy);
  const canModify = canDeleteTask(task, currentUser, users) || canEditTask(task, currentUser, users);
  const canComment = task.assignedTo?.includes(currentUser?.id || '') || false;
  const isReport = !!task.reportTemplate && task.reportTemplate.length > 0;
  const myReport = task.submissions?.find(r => r.userId === currentUser?.id);
  const isTaskClosed = task.status === 'done';

  const handleRemindIndividual = async (uid: string, userName: string) => {
    const targetUser = users.find(u => u.id === uid);
    if (!targetUser?.fcmTokens) {
      showToast('Giáo viên này chưa cài App hoặc chưa bật thông báo!');
      return;
    }
    try {
      const tokens = Array.isArray(targetUser.fcmTokens) ? targetUser.fcmTokens : [targetUser.fcmTokens];
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens,
          title: '🔔 NHẮC NHỞ CÔNG VIỆC',
          body: `Bạn chưa hoàn thành/xem nội dung: "${task.title}". Vui lòng kiểm tra ngay!`
        })
      });
      showToast(`Đã gửi nhắc nhở đến ${userName}!`);
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi gửi nhắc nhở.');
    }
  };

  const assignedUsersData = useMemo(() => {
    if (!task.assignedTo) return [];
    
    const mapped = task.assignedTo.map(uid => {
      const u = users.find(user => user.id === uid);
      const isRead = task.readBy?.includes(uid);
      const sub = task.submissions?.find(r => r.userId === uid);
      
      let statusType: 'done' | 'doing' | 'pending' = 'pending';
      if (task.category === 'announcement') {
        if (isRead) statusType = 'done';
      } else if (task.category === 'poll') {
        const hasVoted = task.pollOptions?.some(opt => opt.votes?.includes(uid));
        if (hasVoted) statusType = 'done';
      } else {
        if (sub?.status === 'done' || (sub && !sub.status)) statusType = 'done';
        else if (sub?.status === 'doing' || sub?.status === 'acknowledged') statusType = 'doing';
      }

      return { uid, user: u, statusType, isRead, submission: sub };
    });

    return mapped.filter(item => {
      if (userSearchQuery) {
        const q = userSearchQuery.toLowerCase();
        const u = item.user;
        if (!u) return false;
        const uGrades = getUserGrades(u.grade);
        const matchName = u.name.toLowerCase().includes(q);
        const matchDept = u.department && u.department.toLowerCase().includes(q);
        const matchGroup = uGrades.some(g => g.toLowerCase().includes(q));
        if (!matchName && !matchDept && !matchGroup) return false;
      }
      return true;
    });
  }, [task, users, userSearchQuery]);

  const doneUsers = assignedUsersData.filter(u => u.statusType === 'done');
  const doingUsers = assignedUsersData.filter(u => u.statusType === 'doing');
  const pendingUsers = assignedUsersData.filter(u => u.statusType === 'pending');

  const handleSend = () => {
    if (!newComment.trim() || isTaskClosed) return;
    addComment(task.id, newComment, replyToId);
    setNewComment('');
    setReplyToId(null);
  };

  const toggleTaskCloseStatus = () => {
    if (window.confirm(isTaskClosed ? 'Bạn muốn mở lại công việc này?' : 'Bạn có chắc chắn muốn ĐÓNG công việc này? (Người nhận sẽ không thể nộp thêm hay comment)')) {
      updateTaskStatus(task.id, isTaskClosed ? 'todo' : 'done');
      showToast(isTaskClosed ? 'Đã mở khóa công việc' : 'Đã đóng công việc thành công');
    }
  };

  const handleDelete = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
      deleteTask(task.id);
      onBack();
    }
  };

  if (isEditingTask) {
    return <TaskForm initialTask={task} onBack={() => setIsEditingTask(false)} />;
  }

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportContent.trim() && !reportUrl.trim() && Object.keys(reportData).length === 0) return;
    if (isTaskClosed) {
      showToast('Công việc đã đóng, không thể nộp!'); return;
    }
    if (!window.confirm("Bạn có chắc chắn muốn nộp báo cáo này không? Bạn có thể cập nhật lại sau.")) return;

    submitReport(task.id, reportContent, reportUrl, reportData);
    setIsEditingReport(false);
    showToast('Đã nộp báo cáo thành công');
  };

  const handleReportDataChange = (id: string, val: string | number) => {
    setReportData(prev => ({ ...prev, [id]: val }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldId: string | null) => {
     const file = e.target.files?.[0];
     if (!file) return;

     if (gasUrl) {
       setIsUploadingFiles(true);
       setUploadProgressState('Đang đọc file...');
       try {
         const reader = new FileReader();
         reader.onload = async (event) => {
           const base64Data = (event.target?.result as string).split(',')[1];
           setUploadProgressState('Đang tải lên Drive...');
           
           try {
             const folderPath = `QuanLyTruongHoc/${new Date().getFullYear()}/Thang_${new Date().getMonth() + 1}/BaoCao`;
             const response = await fetch(gasUrl, {
               method: 'POST',
               body: JSON.stringify({ fileName: file.name, mimeType: file.type || 'application/octet-stream', fileData: base64Data, folderPath: folderPath }),
               headers: { 'Content-Type': 'text/plain;charset=utf-8' }
             });
             const result = await response.json();
             if (result.url) {
               fieldId ? handleReportDataChange(fieldId, result.url) : setReportUrl(result.url);
             } else {
               throw new Error(result.error || 'Server không trả về URL');
             }
           } catch (err: any) {
             console.error(err);
             alert('Lỗi lưu Google Drive: ' + err.message);
           } finally {
             setIsUploadingFiles(false);
             setUploadProgressState('');
           }
         };
         reader.readAsDataURL(file);
       } catch (err: any) {
         alert('Lỗi: ' + err.message);
         setIsUploadingFiles(false);
         setUploadProgressState('');
       }
     } else {
       const reader = new FileReader();
       reader.onload = (event) => {
         const url = event.target?.result as string;
         fieldId ? handleReportDataChange(fieldId, url) : setReportUrl(url);
       };
       reader.readAsDataURL(file);
     }
  };

  const exportToExcel = () => {
    if (!task.reportTemplate || task.reportTemplate.length === 0) return;
    
    const headers = ['Giáo viên', 'Trạng thái', ...task.reportTemplate.map(f => f.label)];
    const rows = [headers];
    
    task.assignedTo.forEach(uid => {
      const u = users.find(user => user.id === uid);
      const name = u?.name || uid;
      const r = task.submissions?.find(rep => rep.userId === uid);
      const isRead = task.readBy?.includes(uid);
      const status = r?.status === 'done' || (r && !r.status) ? 'Đã hoàn thành' : (r?.status === 'doing' || r?.status === 'acknowledged') ? 'Đang làm' : isRead ? 'Đã xem' : 'Chưa làm';
      
      const rowData = [name, status];
      task.reportTemplate!.forEach(f => {
        const preVal = task.reportPrefill?.[uid]?.[f.id];
        let val = r ? r.data?.[f.id] : preVal;
        rowData.push(val !== undefined && val !== null ? String(val) : '');
      });
      rows.push(rowData);
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Báo cáo");
    XLSX.writeFile(wb, `Bao_cao_${task.title.replace(/ /g, '_')}.xlsx`);
  };

  const renderAdminReportTable = () => {
    if (!task.reportTemplate || task.reportTemplate.length === 0) return null;
    
    const sums: Record<string, number> = {};
    task.reportTemplate.filter(f => f.type === 'number').forEach(f => {
      sums[f.id] = assignedUsersData.reduce((acc, item) => {
        const r = item.submission;
        const val = r ? r.data?.[f.id] : task.reportPrefill?.[item.uid]?.[f.id];
        return acc + (val ? Number(val) : 0);
      }, 0);
    });

    return (
      <div className="mt-4 overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm hide-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-bold text-slate-600">Giáo viên</th>
              <th className="px-4 py-3 font-bold text-slate-600">Trạng thái</th>
              {task.reportTemplate.map(f => (
                <th key={f.id} className="px-4 py-3 font-bold text-slate-600">{f.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...pendingUsers, ...doingUsers, ...doneUsers].map(item => {
              const { uid, user: u, statusType, isRead, submission: r } = item;
              const userName = u?.name || uid;
              return (
                <tr key={uid} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <div>{userName}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {typeof u?.department === 'string' ? u.department : 'Khác'}
                      {u && getUserGrades(u.grade).length > 0 && ` • ${getUserGrades(u.grade).join(', ')}`}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {statusType === 'done' ? <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">Đã hoàn thành</span> : 
                       statusType === 'doing' ? <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">Đang làm</span> : 
                       <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">Chưa làm</span>}
                      
                      {/* VÁ LỖI MẤT CHUÔNG Ở BẢNG EXCEL: NÚT CHUÔNG ĐƯỢC CHÈN VÀO ĐÂY */}
                      {statusType !== 'done' && !isTaskClosed && canModify && (
                        <button 
                          onClick={() => handleRemindIndividual(uid, userName)}
                          className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-lg transition-colors border border-rose-200 shadow-sm"
                          title="Nhắc nhở cá nhân này"
                        >
                          <BellRing className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  {task.reportTemplate!.map(f => {
                    const preVal = task.reportPrefill?.[uid]?.[f.id];
                    const val = r ? r.data?.[f.id] : preVal;
                    const hasPrefill = preVal !== undefined && preVal !== '';
                    return (
                    <td key={f.id} className={cn("px-4 py-3", hasPrefill ? "bg-emerald-50/30 font-medium text-emerald-800" : "text-slate-600")}>
                      {f.type === 'file' ? (val ? <div className="w-48"><FilePreview title={f.label} url={String(val)} /></div> : '-') : (val || '-')}
                    </td>
                  )})}
                </tr>
              )
            })}
            {assignedUsersData.length === 0 && (
              <tr>
                <td colSpan={task.reportTemplate.length + 2} className="px-4 py-8 text-center text-slate-400 text-sm italic">Không tìm thấy kết quả phù hợp.</td>
              </tr>
            )}
            {task.reportTemplate.some(f => f.type === 'number') && assignedUsersData.length > 0 && (
              <tr className="bg-indigo-50/50 font-bold">
                <td className="px-4 py-3 text-indigo-800" colSpan={2}>Tổng cộng</td>
                {task.reportTemplate.map(f => (
                  <td key={f.id} className="px-4 py-3 text-indigo-800">
                    {f.type === 'number' ? sums[f.id] : '-'}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderUserRow = (item: any) => {
    const { uid, user: u, statusType } = item;
    const userName = u?.name || uid;
    const uDept = typeof u?.department === 'string' ? u.department : 'Khác';
    const uGrades = u ? getUserGrades(u.grade) : [];
    
    let badge = <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">Chưa xem/Chưa làm</span>;
    if (statusType === 'done') {
      badge = <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">{task.category === 'announcement' ? 'Đã xem' : task.category === 'poll' ? 'Đã tham gia' : 'Đã hoàn thành'}</span>;
    } else if (statusType === 'doing') {
      badge = <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">Đang làm</span>;
    }

    return (
      <div key={uid} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors shadow-sm">
        <div className="flex flex-col min-w-0 pr-2 flex-1">
          <span className="font-bold text-sm text-slate-700 truncate">{userName}</span>
          <span className="text-[10px] text-slate-400 truncate mt-0.5">
            {uDept} {uGrades.length > 0 && <span className="text-indigo-400 ml-1">• {uGrades.join(', ')}</span>}
          </span>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {badge}
          {statusType !== 'done' && !isTaskClosed && canModify && (
            <button 
              onClick={() => handleRemindIndividual(uid, userName)}
              className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-lg transition-colors border border-rose-200 shadow-sm"
              title="Nhắc nhở cá nhân này"
            >
              <BellRing className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 bg-slate-50 z-30 flex flex-col animate-in slide-in-from-right-8 duration-200">
      
      {/* HEADER QUYỀN LỰC */}
      <div className="bg-white px-4 h-14 flex items-center gap-3 border-b border-slate-200 flex-shrink-0 justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 shrink-0">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="font-semibold text-lg truncate leading-tight">Chi tiết {task.category === 'announcement' ? 'Thông báo' : task.category === 'poll' ? 'Khảo sát' : 'Công việc'}</h2>
        </div>
        {canModify && (
          <div className="flex gap-1 shrink-0 -mr-2">
            <button 
              onClick={toggleTaskCloseStatus} 
              className={cn("p-2 rounded-full transition-colors shrink-0", isTaskClosed ? "text-slate-500 hover:bg-slate-100" : "text-emerald-600 hover:bg-emerald-50")}
              title={isTaskClosed ? "Mở lại việc" : "Đóng chốt sổ"}
            >
              {isTaskClosed ? <ArchiveRestore className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
            </button>

            {task.category !== 'announcement' && (
              <button 
                onClick={() => useAppContext().toggleCommentsLock(task.id)} 
                className={cn("p-2 rounded-full transition-colors shrink-0", task.commentsLocked ? "text-slate-500 hover:bg-slate-100" : "text-amber-500 hover:bg-amber-50")}
                title={task.commentsLocked ? "Mở khóa bình luận" : "Khóa bình luận"}
              >
                {task.commentsLocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </button>
            )}
            {!isTaskClosed && (
              <button onClick={() => setIsEditingTask(true)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors shrink-0">
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={handleDelete} className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors shrink-0">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 bg-white border-b border-slate-200">
          <div className="flex gap-3 items-start">
            <div className="mt-1 text-slate-400">
              {isTaskClosed ? <CheckCircle2 className="w-7 h-7 text-emerald-500" /> : <FileText className={cn("w-7 h-7", task.category === 'announcement' ? "text-sky-500" : task.category==='poll' ? "text-amber-500" : "text-indigo-500")} />}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className={cn("text-xl font-bold", isTaskClosed ? "text-slate-500 line-through" : "text-slate-900")}>{task.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] sm:text-xs">
                <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-600 border shadow-sm">
                  Giao bởi: {author?.name || 'Admin'}
                </span>
                {task.deadline && (
                  <span className={cn("flex items-center gap-1 px-2 py-0.5 border shadow-sm rounded-md font-bold tracking-wide", isTaskClosed ? "bg-slate-50 border-slate-200 text-slate-500" : "text-rose-600 bg-rose-50 border-rose-100")}>
                    <Clock className="w-3.5 h-3.5" /> 
                    {task.category === 'announcement' ? 'Hạn xem/Diễn ra:' : 'Hạn chót:'} {format(parseISO(task.deadline), 'HH:mm dd/MM')}
                  </span>
                )}
                {isTaskClosed && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-emerald-200">Đã chốt sổ</span>}
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-slate-700 whitespace-pre-wrap leading-relaxed text-[13px] bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
            {task.description}
          </div>

          {task.attachments && task.attachments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tệp đính kèm ({task.attachments.length})</h4>
              {task.attachments.map((att, idx) => (
                <FilePreview key={idx} title={att.title} url={att.url} />
              ))}
            </div>
          )}

          {!isManagerView && !isTaskClosed && currentUser && task.assignedTo?.includes(currentUser.id) && task.category === 'task' && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Trạng thái của bạn</h4>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    submitReport(task.id, myReport?.content || '', myReport?.fileUrl, myReport?.data, 'doing');
                    showToast('Đã cập nhật: Đang làm');
                  }}
                  className={cn("px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all active:scale-95", 
                    myReport?.status === 'doing' ? "bg-amber-50 text-amber-700 border-amber-200 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Đang làm</span>
                </button>
                <button 
                  onClick={() => {
                    submitReport(task.id, myReport?.content || '', myReport?.fileUrl, myReport?.data, 'done');
                    showToast('Đã cập nhật: Đã hoàn thành');
                  }}
                  className={cn("px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all active:scale-95", 
                    myReport?.status === 'done' ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Đã hoàn thành</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {!isManagerView && isReport && (
          <div className="p-4 bg-white border-b border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bảng nhập liệu yêu cầu</h4>
            </div>
            {myReport && !isEditingReport ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400"></div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2 items-center text-emerald-700 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" /> Bạn đã điền dữ liệu
                  </div>
                  {!isTaskClosed && (
                    <button onClick={() => setIsEditingReport(true)} className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" /> Sửa
                    </button>
                  )}
                </div>
                {myReport.data && (
                  <div className="bg-white rounded-xl p-3 text-sm text-slate-700 shadow-sm border border-emerald-50 space-y-2">
                    {task.reportTemplate!.map(f => (
                      <div key={f.id} className="flex justify-between border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400">{f.label}</span>
                        <span className="font-bold">{myReport.data![f.id] || '-'}</span>
                      </div>
                    ))}
                  </div>
                )}
                {myReport.content && <div className="mt-2 text-xs text-slate-600 bg-white p-2 rounded-lg border border-emerald-50 italic">Ghi chú: {myReport.content}</div>}
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
                {isTaskClosed ? (
                   <div className="text-center text-rose-500 font-bold text-sm p-4">Công việc này đã đóng, không thể nhập liệu thêm.</div>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {task.reportTemplate!.map(f => {
                        const isPrefilled = getIsPrefilled(f.id);
                        return (
                        <div key={f.id} className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
                          <label className="text-[11px] font-bold text-slate-600 uppercase w-1/3 truncate" title={f.label}>{f.label}</label>
                          <input 
                            type={f.type === 'number' ? 'number' : 'text'}
                            value={reportData[f.id] || ''}
                            onChange={e => handleReportDataChange(f.id, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                            className="flex-1 border-0 bg-slate-50 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-300 font-medium"
                            required={f.required}
                            disabled={isPrefilled}
                            placeholder={`Nhập ${f.type === 'number' ? 'số' : 'chữ'}...`}
                          />
                        </div>
                      )})}
                    </div>
                    <input 
                      type="text" value={reportContent} onChange={e => setReportContent(e.target.value)}
                      placeholder="Ghi chú thêm (Tùy chọn)..."
                      className="w-full bg-white border border-slate-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400"
                    />
                    <div className="flex gap-2 mt-2">
                      <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
                        <Send className="w-4 h-4" /> LƯU DỮ LIỆU
                      </button>
                      {isEditingReport && (
                        <button type="button" onClick={() => setIsEditingReport(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-3 rounded-xl transition-all">Hủy</button>
                      )}
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        )}

        {canModify && (
          <div className="p-4 bg-slate-100/50 border-b border-slate-200">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Search className="w-4 h-4"/> THEO DÕI THỰC HIỆN ({doneUsers.length}/{assignedUsersData.length})
                </h4>
                {task.reportTemplate && task.reportTemplate.length > 0 && (
                  <button onClick={exportToExcel} className="flex items-center gap-1 text-[10px] font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                    <Download className="w-3.5 h-3.5" /> Xuất Excel
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" placeholder="Tìm tên giáo viên..." value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-xs rounded-xl pl-8 pr-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all font-medium shadow-sm"
                />
              </div>
            </div>
            
            {task.reportTemplate && task.reportTemplate.length > 0 ? (
              renderAdminReportTable()
            ) : (
              <div className="space-y-4 pr-1">
                {(pendingUsers.length > 0 || doingUsers.length > 0) && (
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold text-rose-500 uppercase tracking-wider bg-rose-50 p-1.5 rounded inline-block">Cần đôn đốc</h5>
                    {pendingUsers.map(renderUserRow)}
                    {doingUsers.map(renderUserRow)}
                  </div>
                )}
                
                {doneUsers.length > 0 && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-200">
                    <h5 className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 p-1.5 rounded inline-block">Đã hoàn thành</h5>
                    {doneUsers.map(renderUserRow)}
                  </div>
                )}
                
                {assignedUsersData.length === 0 && (
                   <div className="text-center py-6 text-slate-400 text-xs italic bg-white rounded-xl border border-slate-200">Không tìm thấy kết quả phù hợp.</div>
                )}
              </div>
            )}
          </div>
        )}

        {task.category !== 'announcement' && (
        <div className="p-4 bg-slate-50">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <MessageSquareReply className="w-4 h-4" /> BÌNH LUẬN & TRAO ĐỔI ({taskComments.length})
          </h4>
          <div className="space-y-4 pb-4">
            {taskComments.filter(c => !c.parentId).map(c => {
              const u = users.find(user => user.id === c.userId);
              const isMe = c.userId === currentUser?.id;
              const replies = taskComments.filter(r => r.parentId === c.id);
              return (
                <div key={c.id} className="flex flex-col gap-2">
                  <div className={cn("flex gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center text-xs font-black text-indigo-700 shadow-sm border border-white">
                      {u?.name.charAt(0)}
                    </div>
                    <div className="flex flex-col gap-1 items-start">
                      <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm", isMe ? "bg-indigo-600 text-white rounded-tr-none self-end" : "bg-white border border-slate-200 rounded-tl-none")}>
                        {!isMe && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{u?.name}</div>}
                        <div className={cn("text-sm leading-relaxed", isMe ? "text-white" : "text-slate-800")}>{c.content}</div>
                        <div className={cn("text-[9px] mt-1.5 font-medium flex justify-between items-center gap-4", isMe ? "text-indigo-200" : "text-slate-400")}>
                          <span>{format(parseISO(c.createdAt), 'HH:mm dd/MM')}</span>
                        </div>
                      </div>
                      {canComment && !task.commentsLocked && !isTaskClosed && (
                        <button onClick={() => setReplyToId(c.id)} className={cn("text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1", isMe ? "self-end mr-1" : "ml-1")}>
                          Trả lời
                        </button>
                      )}
                    </div>
                  </div>
                  {replies.length > 0 && (
                    <div className="pl-11 space-y-3 mt-1">
                      {replies.map(r => {
                        const ru = users.find(user => user.id === r.userId);
                        const rIsMe = r.userId === currentUser?.id;
                        return (
                          <div key={r.id} className={cn("flex gap-2", rIsMe ? "flex-row-reverse" : "flex-row")}>
                            <div className="w-6 h-6 rounded-full bg-indigo-50 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-indigo-400 border border-white">
                              {ru?.name.charAt(0)}
                            </div>
                            <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 shadow-sm", rIsMe ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white border border-slate-200 rounded-tl-none")}>
                              {!rIsMe && <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{ru?.name}</div>}
                              <div className={cn("text-xs leading-relaxed", rIsMe ? "text-white" : "text-slate-700")}>{r.content}</div>
                              <div className={cn("text-[8px] mt-1 font-medium", rIsMe ? "text-indigo-200 text-right" : "text-slate-400 text-left")}>
                                {format(parseISO(r.createdAt), 'HH:mm dd/MM')}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
            {taskComments.length === 0 && (
              <div className="text-center text-slate-400 text-xs font-medium italic mt-8">Chưa có bình luận nào.</div>
            )}
          </div>
        </div>
        )}
      </div>

      {task.category !== 'announcement' && canComment && (
      <div className="bg-white p-3 border-t border-slate-200 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
        {task.commentsLocked || isTaskClosed ? (
          <div className="flex items-center justify-center py-2.5 text-slate-500 text-xs font-bold gap-2 bg-slate-100 rounded-xl border border-slate-200">
            <Lock className="w-4 h-4" /> {isTaskClosed ? 'Công việc đã đóng chốt' : 'Bình luận đã bị khóa'}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {replyToId && (
              <div className="flex justify-between items-center text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <span>Đang trả lời <span className="font-bold text-indigo-600">{users.find(u => u.id === comments.find(c => c.id === replyToId)?.userId)?.name}</span></span>
                <button onClick={() => setReplyToId(null)} className="hover:text-rose-500 font-bold text-rose-400"><X className="w-4 h-4"/></button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Nhập nội dung trao đổi..."
                className="flex-1 max-h-32 min-h-[44px] bg-slate-100 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-none transition-all shadow-inner"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
              />
              <button 
                onClick={handleSend}
                disabled={!newComment.trim()}
                className="w-11 h-11 flex items-center justify-center rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-colors flex-shrink-0 shadow-sm"
              >
                <Send className="w-5 h-5 ml-[-2px]" />
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
