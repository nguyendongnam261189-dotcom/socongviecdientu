import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, Send, Paperclip, CheckCircle2, Circle, Clock, Trash2, FileText, Download, Lock, Unlock, MessageSquareReply, Edit2 } from 'lucide-react';
import { Task } from '../../types';
import { cn, canDeleteTask, canEditTask } from '../../utils';
import * as XLSX from 'xlsx';

import { TaskForm } from './TaskForm';

interface TaskDetailProps {
  task: Task;
  onBack: () => void;
}

const FilePreview: React.FC<{ title: string, url: string }> = ({ title, url }) => {
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(title) || url.startsWith('data:image/');
  const isPdf = /\.(pdf)$/i.test(title) || url.startsWith('data:application/pdf');
  
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const fileId = driveMatch ? driveMatch[1] : null;

  const [isOpen, setIsOpen] = useState(false);

  // If it's a base64 image or pdf, we can just show it directly
  if (!fileId && !isImage && !isPdf) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition-colors cursor-pointer text-sm shadow-sm group bg-white">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
          <Paperclip className="w-4 h-4" />
        </div>
        <span className="font-bold text-slate-700 truncate flex-1">{title}</span>
        <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
      </a>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors cursor-pointer text-sm"
      >
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
          {isImage ? <FileText className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
        </div>
        <span className="font-bold text-slate-700 truncate flex-1">{title}</span>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
          {isOpen ? 'Thu gọn' : 'Xem trực tiếp'}
        </span>
        <a href={url} download={title} onClick={e => e.stopPropagation()} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100">
           <Download className="w-4 h-4" />
        </a>
      </div>
      
      {isOpen && (
        <div className="border-t border-slate-100 bg-slate-50 p-2 flex justify-center">
          {isImage ? (
            <img 
              src={fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200` : url} 
              alt={title} 
              className="max-w-full max-h-[70vh] object-contain rounded-lg border border-slate-200 shadow-sm"
            />
          ) : (
            <iframe 
              src={fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url} 
              className="w-full h-[60vh] rounded-lg border border-slate-200 shadow-sm"
              allow="autoplay"
            />
          )}
        </div>
      )}
    </div>
  );
};

export const TaskDetail: React.FC<TaskDetailProps> = ({ task, onBack }) => {
  const { comments, users, currentUser, addComment, updateTaskStatus, deleteTask, submitReport, showToast, markTaskRead, gasUrl } = useAppContext();
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadProgressState, setUploadProgressState] = useState('');
  
  const [isEditingTask, setIsEditingTask] = useState(false);

  useEffect(() => {
    markTaskRead(task.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  
  // Report state
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
  const isReport = !!task.reportTemplate;
  const myReport = task.submissions?.find(r => r.userId === currentUser?.id);

  const handleSend = () => {
    if (!newComment.trim()) return;
    addComment(task.id, newComment, replyToId);
    setNewComment('');
    setReplyToId(null);
  };

  const toggleStatus = () => {
    if (isReport) return; // For tasks with report template, prevent status toggle.
    const oldStatus = task.status;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateTaskStatus(task.id, newStatus);
    showToast(
      newStatus === 'done' ? 'Đã đánh dấu hoàn thành' : 'Đã chuyển về chưa làm',
      () => updateTaskStatus(task.id, oldStatus)
    );
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
    
    if (!window.confirm("Bạn có chắc chắn muốn nộp báo cáo này không? Bạn có thể cập nhật lại sau.")) {
      return;
    }

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
               if (fieldId) {
                  handleReportDataChange(fieldId, result.url);
               } else {
                  setReportUrl(result.url);
               }
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
       // Fallback to base64 length string if gasUrl not there
       const reader = new FileReader();
       reader.onload = (event) => {
         const url = event.target?.result as string;
         if (fieldId) {
            handleReportDataChange(fieldId, url);
         } else {
            setReportUrl(url);
         }
       };
       reader.readAsDataURL(file);
     }
  };

  const exportToExcel = () => {
    if (!task.reportTemplate || task.reportTemplate.length === 0) return;
    
    // Header
    const headers = ['Giáo viên', 'Trạng thái', ...task.reportTemplate.map(f => f.label)];
    const rows = [headers];
    
    // Data rows
    task.assignedTo.forEach(uid => {
      const u = users.find(user => user.id === uid);
      const name = u?.name || uid;
      const r = task.submissions?.find(rep => rep.userId === uid);
      const isRead = task.readBy?.includes(uid);
      const status = r?.status === 'done' || (r && !r.status) ? 'Đã hoàn thành' : (r?.status === 'doing' || r?.status === 'acknowledged') ? 'Đã nắm thông tin/Đang làm' : isRead ? 'Đã xem' : 'Chưa làm';
      
      const rowData = [name, status];
      task.reportTemplate!.forEach(f => {
        const preVal = task.reportPrefill?.[uid]?.[f.id];
        let val = r ? r.data?.[f.id] : preVal;
        rowData.push(val !== undefined && val !== null ? String(val) : '');
      });
      rows.push(rowData);
    });
    
    // create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Báo cáo");
    
    // Write array buffer
    XLSX.writeFile(wb, `Bao_cao_${task.title.replace(/ /g, '_')}.xlsx`);
  };

  const handleDocumentClick = (e: React.MouseEvent) => {
    // Optional utility wrapper
  };

  // Render logic for admin report table
  const renderAdminReportTable = () => {
    if (!task.reportTemplate || task.reportTemplate.length === 0) return null;
    
    // Compute sums for numbers
    const sums: Record<string, number> = {};
    task.reportTemplate.filter(f => f.type === 'number').forEach(f => {
      sums[f.id] = task.assignedTo.reduce((acc, uid) => {
        const r = task.submissions?.find(rep => rep.userId === uid);
        const val = r ? r.data?.[f.id] : task.reportPrefill?.[uid]?.[f.id];
        return acc + (val ? Number(val) : 0);
      }, 0);
    });

    return (
      <div className="mt-4 overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
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
            {task.assignedTo.map(uid => {
              const u = users.find(user => user.id === uid);
              const r = task.submissions?.find(rep => rep.userId === uid);
              return (
                <tr key={uid} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{u?.name || uid}</td>
                  <td className="px-4 py-3">
                    {r?.status === 'done' || (r && !r.status) ? <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">Đã hoàn thành</span> : 
                     (r?.status === 'doing' || r?.status === 'acknowledged') ? <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">Đã nắm thông tin/Đang làm</span> : 
                     task.readBy?.includes(uid) ? <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">Đã xem</span> :
                     <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">Chưa làm</span>}
                  </td>
                  {task.reportTemplate!.map(f => {
                    const preVal = task.reportPrefill?.[uid]?.[f.id];
                    const val = r ? r.data?.[f.id] : preVal;
                    const hasPrefill = preVal !== undefined && preVal !== '';
                    return (
                    <td key={f.id} className={cn("px-4 py-3", hasPrefill ? "bg-emerald-50/30 font-medium text-emerald-800" : "text-slate-600")}>
                      {f.type === 'file' ? (
                         val ? <div className="w-48"><FilePreview title={f.label} url={String(val)} /></div> : '-'
                      ) : (
                         val || '-'
                      )}
                    </td>
                  )})}
                </tr>
              )
            })}
            {task.reportTemplate.some(f => f.type === 'number') && (
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

  return (
    <div className="absolute inset-0 bg-slate-50 z-30 flex flex-col animate-in slide-in-from-right-8 duration-200">
      {/* Header */}
      <div className="bg-white px-4 h-14 flex items-center gap-3 border-b border-slate-200 flex-shrink-0 justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 shrink-0">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="font-semibold text-lg truncate leading-tight">Chi tiết công việc</h2>
        </div>
        {canModify && (
          <div className="flex gap-1 shrink-0 -mr-2">
            {task.category !== 'announcement' && (
              <button 
                onClick={() => useAppContext().toggleCommentsLock(task.id)} 
                className={cn("p-2 rounded-full transition-colors shrink-0", task.commentsLocked ? "text-slate-500 hover:bg-slate-100" : "text-amber-500 hover:bg-amber-50")}
                title={task.commentsLocked ? "Mở khóa bình luận" : "Khóa bình luận"}
              >
                {task.commentsLocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </button>
            )}
            <button onClick={() => setIsEditingTask(true)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors shrink-0">
              <Edit2 className="w-5 h-5" />
            </button>
            <button onClick={handleDelete} className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors shrink-0">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 bg-white border-b border-slate-200">
          <div className="flex gap-3 items-start">
            {task.category === 'announcement' || task.category === 'poll' ? (
              <div className="mt-1 text-slate-400">
                <FileText className="w-7 h-7 text-sky-500" />
              </div>
            ) : isReport ? (
              <div className="mt-1 text-slate-400">
                {myReport?.status === 'done' || (!myReport?.status && myReport) ? <CheckCircle2 className="w-7 h-7 text-emerald-500" /> : <FileText className="w-7 h-7 text-amber-500" />}
              </div>
            ) : (
              <div className="mt-1 text-slate-400">
                {myReport?.status === 'done' || task.status === 'done' ? <CheckCircle2 className="w-7 h-7 text-emerald-500" /> : <Circle className="w-7 h-7" />}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900">{task.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] sm:text-xs">
                <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-600 border shadow-sm">
                  Giao bởi: {author?.name || 'Admin'}
                </span>
                {task.deadline && (
                  <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 border border-rose-100 shadow-sm rounded-md font-bold tracking-wide">
                    <Clock className="w-3.5 h-3.5" /> 
                    Hạn: {format(parseISO(task.deadline), 'HH:mm dd/MM/yyyy')}
                  </span>
                )}
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

          {/* User Status Bar */}
          {task.category === 'task' && currentUser && task.assignedTo?.includes(currentUser.id) && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Trạng thái của bạn</h4>
              <div className="flex gap-2">
                <button 
                  onClick={() => submitReport(task.id, myReport?.content || '', myReport?.fileUrl, myReport?.data, 'doing')}
                  className={cn("px-3 py-1.5 rounded-lg border text-[11px] sm:text-xs font-bold transition-all", 
                    myReport?.status === 'doing' || myReport?.status === 'acknowledged' ? "bg-amber-50 text-amber-700 border-amber-200 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <span className="flex items-center gap-1.5"><Clock className={cn("w-3.5 h-3.5", myReport?.status === 'doing' || myReport?.status === 'acknowledged' ? "text-amber-600" : "text-transparent")} /> Đã nắm thông tin/Đang làm</span>
                </button>
                {!isReport && (
                  <button 
                    onClick={() => submitReport(task.id, myReport?.content || '', myReport?.fileUrl, myReport?.data, 'done')}
                    className={cn("px-3 py-1.5 rounded-lg border text-[11px] sm:text-xs font-bold transition-all", 
                      myReport?.status === 'done' ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <span className="flex items-center gap-1.5"><CheckCircle2 className={cn("w-3.5 h-3.5", myReport?.status === 'done' ? "text-emerald-600" : "text-transparent")} /> Đã hoàn thành</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Report Submission Section */}
        {isReport && (
          <div className="p-4 bg-white border-b border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nộp báo cáo</h4>
            </div>
            {myReport && !isEditingReport ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400"></div>
                <div className="flex justify-between items-start">
                  <div className="flex gap-2 items-center mb-3 text-emerald-700 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    Bạn đã nộp báo cáo
                  </div>
                  <button 
                    onClick={() => setIsEditingReport(true)}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa
                  </button>
                </div>
                {myReport.content && (
                  <div className="bg-white rounded-xl p-3 text-sm text-slate-700 shadow-sm border border-emerald-50 mb-2">
                    <div className="font-medium whitespace-pre-wrap">{myReport.content}</div>
                  </div>
                )}
                {myReport.fileUrl && (
                  <div className="mt-2">
                    <FilePreview title="Tệp / Link đính kèm" url={myReport.fileUrl} />
                  </div>
                )}
                {task.reportTemplate && task.reportTemplate.length > 0 && myReport.data && (
                  <div className="bg-white rounded-xl p-3 text-sm text-slate-700 shadow-sm border border-emerald-50 mt-2 space-y-2">
                    {task.reportTemplate.map(f => (
                      <div key={f.id} className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400">{f.label}</span>
                        {f.type === 'file' ? (
                          myReport.data![f.id] ? <div className="mt-1"><FilePreview title={f.label} url={String(myReport.data![f.id])} /></div> : '-'
                        ) : (
                          <span className="font-medium">{myReport.data![f.id] || '-'}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-emerald-600/70 font-bold mt-3">
                  Nộp lúc: {format(parseISO(myReport.submittedAt), 'HH:mm dd/MM/yyyy')}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-100 shadow-sm">
                
                {task.reportTemplate && task.reportTemplate.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <p className="text-xs font-bold text-slate-600">Điền các thông tin sau:</p>
                    {task.reportTemplate.map(f => {
                      const isPrefilled = getIsPrefilled(f.id);
                      return (
                      <div key={f.id}>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          {f.label} {isPrefilled && <span className="text-emerald-500 ml-1">(Đã điền sẵn)</span>}
                        </label>
                        {f.type === 'number' ? (
                          <input 
                            type="number"
                            value={reportData[f.id] || ''}
                            onChange={e => handleReportDataChange(f.id, Number(e.target.value))}
                            className={cn("w-full border text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium", isPrefilled ? "bg-slate-100 border-transparent text-slate-500 cursor-not-allowed" : "bg-white border-slate-200 text-slate-800 shadow-inner")}
                            required={f.required}
                            disabled={isPrefilled}
                          />
                        ) : f.type === 'file' ? (
                          <div className="space-y-2">
                            <input 
                              type="file"
                              onChange={e => handleFileUpload(e, f.id)}
                              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all font-medium disabled:opacity-50"
                              required={f.required && !reportData[f.id]}
                              disabled={isPrefilled || isUploadingFiles}
                            />
                            {isUploadingFiles && <span className="text-xs text-indigo-500 block">Đang tải lên... {uploadProgressState}</span>}
                            {reportData[f.id] && !isUploadingFiles && (
                               <div className="p-2 bg-emerald-50 rounded border border-emerald-100 flex items-center gap-2">
                                 <span className="text-xs text-emerald-600 font-medium truncate flex-1">Đã tải tệp lên!</span>
                                 {!isPrefilled && <button type="button" onClick={() => handleReportDataChange(f.id, '')} className="text-rose-500 hover:text-rose-700 text-xs font-bold">Xóa</button>}
                               </div>
                            )}
                          </div>
                        ) : (
                          <input 
                            type="text"
                            value={reportData[f.id] || ''}
                            onChange={e => handleReportDataChange(f.id, e.target.value)}
                            className={cn("w-full border text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium", isPrefilled ? "bg-slate-100 border-transparent text-slate-500 cursor-not-allowed" : "bg-white border-slate-200 text-slate-800 shadow-inner")}
                            required={f.required}
                            disabled={isPrefilled}
                          />
                        )}
                      </div>
                    )})}
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Nội dung / Ghi chú thêm <span className="font-normal normal-case text-slate-400">{!task.reportTemplate ? '' : '(Tùy chọn)'}</span></label>
                  <textarea 
                    value={reportContent}
                    onChange={e => setReportContent(e.target.value)}
                    placeholder="Nhập nội dung vắn tắt hoặc ý kiến..."
                    className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium shadow-inner min-h-[80px]"
                    required={!task.reportTemplate}
                  />
                </div>
                {!task.reportTemplate && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Tải tệp đính kèm (Hình ảnh, PDF, Word...) <span className="font-normal normal-case text-slate-400">(Tùy chọn)</span></label>
                    <input 
                      type="file"
                      disabled={isUploadingFiles}
                      onChange={e => handleFileUpload(e, null)}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all font-medium disabled:opacity-50"
                    />
                    {isUploadingFiles && <span className="text-xs text-indigo-500 mt-2 block">Đang tải lên... {uploadProgressState}</span>}
                    {reportUrl && !isUploadingFiles && (
                       <div className="mt-2 p-2 bg-emerald-50 rounded border border-emerald-100 flex items-center gap-2">
                         <span className="text-xs text-emerald-600 font-medium truncate flex-1">Đã đính kèm tệp: {reportUrl}</span>
                         <button type="button" onClick={() => setReportUrl('')} className="text-rose-500 hover:text-rose-700 text-xs font-bold">Xóa</button>
                       </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <button type="submit" disabled={isUploadingFiles} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" /> {isEditingReport ? 'CẬP NHẬT BÁO CÁO' : 'NỘP BÁO CÁO'}
                  </button>
                  {isEditingReport && myReport && (
                    <button 
                      type="button" 
                      onClick={() => setIsEditingReport(false)}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-3 text-sm rounded-xl transition-all"
                    >
                      Hủy
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* Report Monitoring (For Creator/Admin) */}
        {task.category !== 'poll' && canModify && (
          <div className="p-4 bg-white border-b border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {task.category === 'announcement' ? `Đã xem (${task.readBy?.length || 0}/${task.assignedTo?.length || 0})` : 
                 isReport ? `Danh sách nộp (${task.submissions?.filter(s => s.status === 'done' || (!s.status && s.fileUrl)).length || 0}/${task.assignedTo.length})` :
                 `Trạng thái (${task.submissions?.filter(s => s.status === 'done').length || 0}/${task.assignedTo.length})`}
              </h4>
              {task.reportTemplate && task.reportTemplate.length > 0 && (
                <button 
                  onClick={exportToExcel}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Xuất Excel
                </button>
              )}
            </div>
            
            {task.reportTemplate && task.reportTemplate.length > 0 ? (
              renderAdminReportTable()
            ) : (
              <div className="space-y-2">
                {task.assignedTo?.map(uid => {
                  const isRead = task.readBy?.includes(uid);
                  const sub = task.submissions?.find(r => r.userId === uid);
                  const userName = users.find(u => u.id === uid)?.name || uid;
                  
                  let badge = <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">Chưa xem</span>;
                  if (task.category === 'announcement') {
                    if (isRead) badge = <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">Đã xem</span>;
                  } else {
                    if (sub?.status === 'done' || (sub && !sub.status)) {
                      badge = <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">Đã hoàn thành</span>;
                    } else if (sub?.status === 'doing' || sub?.status === 'acknowledged') {
                      badge = <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">Đã nắm thông tin/Đang làm</span>;
                    } else if (isRead) {
                      badge = <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">Đã xem</span>;
                    } else {
                      badge = <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">Chưa làm</span>;
                    }
                  }

                  return (
                    <div key={uid} className="flex justify-between items-center p-3 rounded-xl border bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-700">{userName}</span>
                      </div>
                      {badge}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Comments section */}
        {task.category !== 'announcement' && (
        <div className="p-4 bg-slate-50">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Trao đổi ({taskComments.length})</h4>
          <div className="space-y-4 pb-4">
            {taskComments.filter(c => !c.parentId).map(c => {
              const u = users.find(user => user.id === c.userId);
              const isMe = c.userId === currentUser?.id;
              const replies = taskComments.filter(r => r.parentId === c.id);
              return (
                <div key={c.id} className="flex flex-col gap-2">
                  <div className={cn("flex gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-500 shadow-sm border border-white">
                      {u?.name.charAt(0)}
                    </div>
                    <div className="flex flex-col gap-1 items-start">
                      <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm", isMe ? "bg-indigo-600 text-white rounded-tr-none self-end" : "bg-white border border-slate-100 rounded-tl-none")}>
                        {!isMe && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{u?.name}</div>}
                        <div className={cn("text-[13px] leading-relaxed", isMe ? "text-white" : "text-slate-800")}>{c.content}</div>
                        <div className={cn("text-[9px] mt-1.5 font-medium flex justify-between items-center gap-4", isMe ? "text-indigo-200" : "text-slate-400")}>
                          <span>{format(parseISO(c.createdAt), 'HH:mm dd/MM/yyyy')}</span>
                        </div>
                      </div>
                      {canComment && !task.commentsLocked && (
                        <button onClick={() => setReplyToId(c.id)} className={cn("text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1", isMe ? "self-end mr-1" : "ml-1")}>
                          <MessageSquareReply className="w-3 h-3" /> Trả lời
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Replies */}
                  {replies.length > 0 && (
                    <div className="pl-11 space-y-3 mt-1">
                      {replies.map(r => {
                        const ru = users.find(user => user.id === r.userId);
                        const rIsMe = r.userId === currentUser?.id;
                        return (
                          <div key={r.id} className={cn("flex gap-2", rIsMe ? "flex-row-reverse" : "flex-row")}>
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm border border-white">
                              {ru?.name.charAt(0)}
                            </div>
                            <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 shadow-sm", rIsMe ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white border border-slate-100 rounded-tl-none")}>
                              {!rIsMe && <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{ru?.name}</div>}
                              <div className={cn("text-xs leading-relaxed", rIsMe ? "text-white" : "text-slate-800")}>{r.content}</div>
                              <div className={cn("text-[8px] mt-1 font-medium", rIsMe ? "text-indigo-200 text-right" : "text-slate-400 text-left")}>
                                {format(parseISO(r.createdAt), 'HH:mm dd/MM/yyyy')}
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
              <div className="text-center text-slate-400 text-xs font-medium italic mt-8">Chưa có trao đổi nào.</div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Input area */}
      {task.category !== 'announcement' && canComment && (
      <div className="bg-white p-3 border-t border-slate-200 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
        {task.commentsLocked ? (
          <div className="flex items-center justify-center py-2 text-slate-400 text-xs font-bold gap-1.5 bg-slate-50 rounded-xl">
            <Lock className="w-4 h-4" /> Bình luận đã bị khóa
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {replyToId && (
              <div className="flex justify-between items-center text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <span>Đang trả lời <span className="font-bold">{users.find(u => u.id === comments.find(c => c.id === replyToId)?.userId)?.name}</span></span>
                <button onClick={() => setReplyToId(null)} className="hover:text-rose-500 font-bold">Hủy</button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Nhập nội dung trao đổi..."
                className="flex-1 max-h-32 min-h-[44px] bg-slate-100 border-transparent rounded-2xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none transition-all shadow-inner"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
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
