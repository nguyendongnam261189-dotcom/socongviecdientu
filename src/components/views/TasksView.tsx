import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Task } from '../../types';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import { CheckCircle2, Circle, Clock, FileText, Zap, Megaphone, FileSpreadsheet, Check } from 'lucide-react';
import { cn, canEditTask } from '../../utils';
import { TaskDetail } from './TaskDetail';

export const TasksView: React.FC = () => {
  const { tasks, currentUser, requestNotificationPermission } = useAppContext();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Bộ lọc 2 lớp cho "Siêu Inbox"
  const [listFilter, setListFilter] = useState<'pending' | 'done'>('pending');
  const [chipFilter, setChipFilter] = useState<'all' | 'task' | 'announcement' | 'poll'>('all');

  const hasToken = (currentUser as any)?.fcmTokens && (currentUser as any).fcmTokens.length > 0;
  const showNotificationBanner = 'Notification' in window && !hasToken;

  // 1. Lấy tất cả Công việc / Thông báo / Khảo sát DÀNH RIÊNG CHO USER NÀY
  const relevantTasks = tasks.filter(t => {
    const isCreator = t.createdBy === currentUser?.id;
    const isAssigned = t.assignedTo?.includes(currentUser?.id || '');
    const isRole = t.targetRoles?.includes(currentUser?.role || '');
    const isDept = t.targetDepartments?.includes(currentUser?.department || '');
    const isGrade = t.targetGrades?.includes(currentUser?.grade || '');
    const isPublic = t.visibility === 'public';
    return !!(isCreator || isAssigned || isRole || isDept || isGrade || isPublic);
  });
  
  // 2. Phân loại và Lọc
  let displayTasks = relevantTasks.filter(t => {
    const isReport = !!t.reportTemplate && t.reportTemplate.length > 0;
    const mySubmission = t.submissions?.find(r => r.userId === currentUser?.id);
    const hasRead = t.readBy?.includes(currentUser?.id || '');
    const hasVoted = t.pollOptions?.some(opt => opt.votes?.includes(currentUser?.id || ''));
    
    // ĐỊNH NGHĨA "ĐÃ XONG" CHO TỪNG LOẠI
    let isDone = false;
    if (t.status === 'done') {
      isDone = true; // Task đã bị đóng global
    } else if (t.category === 'announcement') {
      isDone = hasRead;
    } else if (t.category === 'poll') {
      isDone = hasVoted;
    } else {
      isDone = mySubmission?.status === 'done' || (isReport && !!mySubmission);
    }
    
    if (listFilter === 'pending' && isDone) return false;
    if (listFilter === 'done' && !isDone) return false;

    if (chipFilter === 'all') return true;
    if (chipFilter === t.category) return true;

    return false;
  });

  // 3. Sắp xếp thông minh
  const sortTasks = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;

      const aOverdue = a.deadline && isPast(parseISO(a.deadline)) && a.status !== 'done';
      const bOverdue = b.deadline && isPast(parseISO(b.deadline)) && b.status !== 'done';
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      if (a.deadline && b.deadline) {
        return parseISO(a.deadline).getTime() - parseISO(b.deadline).getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;

      return parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime();
    });
  };

  const finalSortedTasks = sortTasks(displayTasks);
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  return (
    <>
      <div className="flex flex-col h-full bg-slate-50 pb-20">
        <div className="bg-white p-4 shadow-sm z-10 sticky top-0 border-b border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-lg text-slate-800 flex items-center justify-between">
              Hộp thư đến / Việc của tôi
            </h2>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl mb-3 w-full max-w-sm">
            <button
              onClick={() => setListFilter('pending')}
              className={cn("flex-1 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all", listFilter === 'pending' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Cần giải quyết
            </button>
            <button
              onClick={() => setListFilter('done')}
              className={cn("flex-1 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all", listFilter === 'done' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Đã xong / Đã xem
            </button>
          </div>
          
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1 snap-x">
            <button
              onClick={() => setChipFilter('all')}
              className={cn("whitespace-nowrap flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all snap-start border", chipFilter === 'all' ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}
            >
              Tất cả
            </button>
            <button
              onClick={() => setChipFilter('task')}
              className={cn("whitespace-nowrap flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all snap-start border", chipFilter === 'task' ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50")}
            >
              Công việc
            </button>
            <button
              onClick={() => setChipFilter('announcement')}
              className={cn("whitespace-nowrap flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all snap-start border", chipFilter === 'announcement' ? "bg-sky-600 text-white border-sky-600 shadow-sm" : "bg-white text-sky-600 border-sky-200 hover:bg-sky-50")}
            >
              Thông báo
            </button>
            <button
              onClick={() => setChipFilter('poll')}
              className={cn("whitespace-nowrap flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all snap-start border", chipFilter === 'poll' ? "bg-amber-600 text-white border-amber-600 shadow-sm" : "bg-white text-amber-600 border-amber-200 hover:bg-amber-50")}
            >
              Khảo sát
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {showNotificationBanner && (
            <div className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded-xl flex justify-between items-center shadow-sm">
              <span className="text-blue-800 font-medium text-[11px] sm:text-xs pr-2">🔔 Kích hoạt thông báo đẩy để không bỏ lỡ tin khẩn cấp!</span>
              <button
                onClick={requestNotificationPermission}
                className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors shadow-sm"
              >
                Bật ngay
              </button>
            </div>
          )}

          {finalSortedTasks.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 border-dashed">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm font-medium">Bạn đã giải quyết hết công việc!</p>
            </div>
          ) : (
             finalSortedTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} />)
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskDetail task={selectedTask} onBack={() => setSelectedTaskId(null)} isManagerView={false} />
      )}
    </>
  );
};

const TaskCard: React.FC<{ task: Task, onClick: () => void }> = ({ task, onClick }) => {
  const { submitReport, comments, showToast, currentUser, votePoll, markTaskRead, users } = useAppContext();
  
  const isReport = !!task.reportTemplate && task.reportTemplate.length > 0;
  const myReport = task.submissions?.find(r => r.userId === currentUser?.id);
  const hasRead = task.readBy?.includes(currentUser?.id || '');
  const hasVoted = task.pollOptions?.some(opt => opt.votes?.includes(currentUser?.id || ''));
  
  // Xác định trạng thái "Đã xong" tùy theo thể loại
  let isDone = false;
  if (task.status === 'done') {
    isDone = true;
  } else if (task.category === 'announcement') {
    isDone = hasRead;
  } else if (task.category === 'poll') {
    isDone = hasVoted;
  } else {
    isDone = myReport?.status === 'done' || (isReport && !!myReport);
  }
  
  const isOverdue = !isDone && task.deadline && isPast(parseISO(task.deadline));
  const isDueToday = !isDone && task.deadline && new Date().toDateString() === parseISO(task.deadline).toDateString();
  const commentCount = comments.filter(c => c.taskId === task.id).length;

  let Icon = FileText;
  let catLabel = "Công việc";
  let colorTheme = "border-indigo-200";

  if (task.category === 'announcement') {
     Icon = Megaphone;
     catLabel = "Thông báo";
     colorTheme = "border-sky-200";
  } else if (task.category === 'poll') {
     Icon = FileSpreadsheet;
     catLabel = "Khảo sát";
     colorTheme = "border-amber-200";
  }

  // TÍNH NĂNG MƯỢN TỪ NOTIFICATION: Xử lý thao tác nhanh
  const handleQuickAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.category === 'announcement') {
       markTaskRead(task.id);
       showToast('Đã đánh dấu là Đã xem');
       return;
    }
    if (task.category === 'task' && !isReport) {
      const newIndividualStatus = myReport?.status === 'done' ? 'todo' : 'done';
      submitReport(task.id, myReport?.content || '', myReport?.fileUrl || '', myReport?.data || {}, newIndividualStatus);
      showToast(newIndividualStatus === 'done' ? 'Đã hoàn thành' : 'Đã chuyển về chưa làm');
    }
  };

  // TÍNH NĂNG MƯỢN TỪ NOTIFICATION: Bầu chọn trực tiếp
  const handleInlineVote = (e: React.MouseEvent, optionId: string) => {
    e.stopPropagation();
    if (task.isLocked) {
      showToast('Khảo sát này đã bị khóa');
      return;
    }
    const oldVoteId = task.pollOptions?.find(opt => opt.votes.includes(currentUser?.id || ''))?.id;
    votePoll(task.id, optionId);
    
    if (oldVoteId === optionId) {
      showToast('Đã hủy bình chọn');
    } else {
      showToast('Đã ghi nhận bình chọn');
    }
  };

  // Tính toán số liệu cho Poll và Announcement Progress
  const canManage = canEditTask(task, currentUser, users);
  const totalVotes = task.pollOptions?.reduce((acc, opt) => acc + opt.votes.length, 0) || 0;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl shadow-sm border-l-4 p-4 active:scale-[0.99] transition-all cursor-pointer relative overflow-hidden",
        isDone ? "border-slate-300 opacity-70 bg-slate-50" : 
        task.isUrgent && task.category === 'task' ? "border-rose-500 bg-rose-50/50 shadow-[0_4px_12px_rgba(244,63,94,0.1)]" :
        isOverdue ? "border-rose-400 bg-white" :
        colorTheme
      )}
    >
      <div className="flex justify-between items-start mb-2.5 gap-2">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className={cn("px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider flex items-center gap-1 border", 
             task.category === 'announcement' ? "bg-sky-50 text-sky-700 border-sky-100" : 
             task.category === 'poll' ? "bg-amber-50 text-amber-700 border-amber-100" : 
             "bg-indigo-50 text-indigo-700 border-indigo-100"
          )}>
            <Icon className="w-3 h-3" /> {catLabel}
          </span>

          {!isDone && (
             <span className={cn(
               "px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider flex items-center gap-1 border",
               task.isUrgent && task.category === 'task' ? "bg-rose-100 text-rose-700 border-rose-200" :
               task.category === 'task' && isReport ? "bg-amber-100 text-amber-700 border-amber-200" :
               task.category === 'task' && myReport?.status === 'doing' ? "bg-amber-100 text-amber-700 border-amber-200" :
               "bg-slate-100 text-slate-600 border-slate-200"
             )}>
               {task.isUrgent && task.category === 'task' && <Zap className="w-3 h-3 text-rose-500 fill-rose-500" />}
               {task.category === 'task' && isReport ? 'Cần nộp báo cáo' : 
                task.category === 'task' && myReport?.status === 'doing' ? 'Đang làm' : 
                task.category === 'poll' ? 'Cần tham gia' : 'Chưa xem / Chưa làm'}
             </span>
          )}

          {!isDone && isDueToday && (
            <span className="px-2 py-0.5 text-[9px] font-bold text-white bg-rose-500 rounded uppercase tracking-wider shadow-sm animate-pulse">
              Hôm nay
            </span>
          )}
        </div>
        
        {task.deadline && (
          <div className={cn("text-[10px] font-bold flex items-center gap-1 shrink-0", isOverdue ? "text-rose-500" : "text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded")}>
            <Clock className="w-3 h-3" />
            {isOverdue && !isDone ? 'Quá hạn' : format(parseISO(task.deadline), 'HH:mm - dd/MM')}
          </div>
        )}
      </div>

      <div className="flex gap-3 items-start mt-2">
        <button 
          onClick={handleQuickAction} 
          disabled={task.category === 'poll' || (task.category === 'task' && isReport)}
          className={cn(
            "mt-0.5 flex-shrink-0 z-10 transition-colors",
            task.category === 'poll' || (task.category === 'task' && isReport) ? "cursor-default" : "cursor-pointer",
            isDone ? "text-emerald-500" : "text-slate-300 hover:text-indigo-500"
          )}
        >
          {isDone ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
        </button>
        
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "text-sm font-bold leading-tight pr-2", 
            isDone ? "text-slate-500" : 
            isOverdue ? "text-rose-600" : "text-slate-800"
          )}>
            {task.title}
          </h3>
          <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 pr-2 leading-relaxed">
            {task.description}
          </p>

          {/* TÍNH NĂNG MƯỢN TỪ NOTIFICATION: KHẢO SÁT INLINE */}
          {task.category === 'poll' && task.pollOptions && (
            <div className="mt-3 space-y-1.5 relative z-10">
              {task.pollOptions.map(opt => {
                const voted = opt.votes.includes(currentUser?.id || '');
                const percent = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                return (
                  <button 
                    key={opt.id} 
                    onClick={(e) => handleInlineVote(e, opt.id)} 
                    className={cn(
                      "w-full text-left p-2 rounded-lg border text-[10px] sm:text-[11px] relative overflow-hidden transition-all shadow-sm", 
                      voted ? (task.isLocked ? "border-slate-400 bg-slate-50" : "border-amber-400 bg-amber-50") : "border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn("absolute inset-y-0 left-0 transition-all opacity-50", voted ? (task.isLocked ? "bg-slate-300" : "bg-amber-300") : (task.isLocked ? "bg-slate-200" : "bg-amber-100"))} style={{ width: `${percent}%` }} />
                    <div className="relative flex justify-between items-center z-10 px-1">
                      <span className={cn("font-bold truncate pr-2", voted ? (task.isLocked ? "text-slate-800" : "text-amber-800") : "text-slate-700")}>{opt.text}</span>
                      <span className="text-slate-500 font-medium text-[9px] shrink-0">{percent}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* TÍNH NĂNG MƯỢN TỪ NOTIFICATION: Nút xem nhanh cho thông báo */}
          {!isDone && task.category === 'announcement' && (
            <button onClick={handleQuickAction} className="mt-3 flex items-center gap-1.5 text-[11px] bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-200 shadow-sm z-10 relative">
              <Check className="w-3.5 h-3.5" /> Đã nắm thông tin
            </button>
          )}

          {/* TÍNH NĂNG MƯỢN TỪ NOTIFICATION: Thanh tiến độ siêu tốc cho Quản lý */}
          {task.category === 'announcement' && canManage && (
            <div className="mt-3 pt-3 border-t border-slate-100/50">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tiến độ tiếp nhận</span>
                <span className="text-[10px] font-bold text-indigo-600">{task.readBy?.length || 0} / {task.assignedTo.length}</span>
              </div>
              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${task.assignedTo.length ? ((task.readBy?.length || 0) / task.assignedTo.length) * 100 : 0}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
        <div className="flex gap-3">
          {commentCount > 0 && (
             <span className="text-indigo-600 flex items-center gap-1">
               💬 {commentCount} trao đổi
             </span>
          )}
          {task.attachments && task.attachments.length > 0 && (
            <span className="text-slate-400 flex items-center gap-1">
              📎 {task.attachments.length} tài liệu
            </span>
          )}
        </div>
        {isDone && (
          <span className="text-emerald-600 italic normal-case font-medium">✓ Đã xử lý</span>
        )}
      </div>
    </div>
  );
};
