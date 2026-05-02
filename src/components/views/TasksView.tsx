import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Task } from '../../types';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import { CheckCircle2, Circle, Clock, FileText, Zap } from 'lucide-react';
import { cn } from '../../utils';
import { TaskDetail } from './TaskDetail';

export const TasksView: React.FC = () => {
  const { tasks, currentUser, requestNotificationPermission } = useAppContext();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<'pending' | 'done'>('pending');
  const [chipFilter, setChipFilter] = useState<'all' | 'urgent' | 'report' | 'overdue'>('all');

  const showNotificationBanner = 'Notification' in window && Notification.permission !== 'granted';

  // 4. Show only relevant tasks
  const relevantTasks = tasks.filter(t => {
    if (t.category !== 'task') return false;
    const isCreator = t.createdBy === currentUser?.id;
    const isAssigned = t.assignedTo?.includes(currentUser?.id || '');
    const isRole = t.targetRoles?.includes(currentUser?.role || '');
    const isDept = t.targetDepartments?.includes(currentUser?.department || '');
    const isGrade = t.targetGrades?.includes(currentUser?.grade || '');
    return !!(isCreator || isAssigned || isRole || isDept || isGrade);
  });
  
  let displayTasks = relevantTasks.filter(t => {
    const isReport = !!t.reportTemplate;
    const hasSubmittedReport = isReport && !!t.submissions?.find(r => r.userId === currentUser?.id);
    const isDone = t.status === 'done' || hasSubmittedReport;
    
    if (listFilter === 'pending' && isDone) return false;
    if (listFilter === 'done' && !isDone) return false;

    if (chipFilter === 'all') return true;
    
    // For other filters, typically we want to see action items (not done), but it's up to you.
    if (chipFilter === 'urgent' && t.isUrgent) return true;
    if (chipFilter === 'report' && isReport) return true;
    if (chipFilter === 'overdue' && t.deadline && isPast(parseISO(t.deadline))) return true;

    return false;
  });

  // 2. Sort by deadline
  const sortTasks = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return parseISO(a.deadline).getTime() - parseISO(b.deadline).getTime();
    });
  };

  // 1. Group tasks
  const overdue: Task[] = [];
  const dueSoon: Task[] = [];
  const active: Task[] = [];
  const completed: Task[] = [];

  displayTasks.forEach(t => {
    const isReport = !!t.reportTemplate;
    const isDone = t.status === 'done' || (isReport && !!t.submissions?.find(r => r.userId === currentUser?.id));
    
    if (isDone) {
      completed.push(t);
    } else if (t.deadline && isPast(parseISO(t.deadline))) {
      overdue.push(t);
    } else if (t.deadline && differenceInDays(parseISO(t.deadline), new Date()) <= 2) {
      dueSoon.push(t);
    } else {
      active.push(t);
    }
  });

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  return (
    <>
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white p-4 shadow-sm z-10 sticky top-0 border-b border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-lg text-slate-800 flex items-center justify-between">
              Nhiệm vụ của tôi
            </h2>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl mb-2 w-full max-w-[300px]">
            <button
              onClick={() => setListFilter('pending')}
              className={cn("flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all", listFilter === 'pending' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Cần thực hiện
            </button>
            <button
              onClick={() => setListFilter('done')}
              className={cn("flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all", listFilter === 'done' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Đã hoàn thành
            </button>
          </div>
          
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 mt-2 -mx-4 px-4 snap-x">
            <button
              onClick={() => setChipFilter('all')}
              className={cn("whitespace-nowrap flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all snap-start", chipFilter === 'all' ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
            >
              Tất cả
            </button>
            <button
              onClick={() => setChipFilter('urgent')}
              className={cn("whitespace-nowrap flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all snap-start", chipFilter === 'urgent' ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
            >
              Cần làm ngay
            </button>
            <button
              onClick={() => setChipFilter('report')}
              className={cn("whitespace-nowrap flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all snap-start", chipFilter === 'report' ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
            >
              Báo cáo cần nộp
            </button>
            <button
              onClick={() => setChipFilter('overdue')}
              className={cn("whitespace-nowrap flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all snap-start", chipFilter === 'overdue' ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
            >
              Đã quá hạn
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Notification Banner */}
          {showNotificationBanner && (
            <div className="bg-blue-100 border-l-4 border-blue-500 p-4 mb-4 flex justify-between items-center">
              <span className="text-blue-800 font-medium text-sm pr-2">🔔 Kích hoạt thông báo đẩy để không bỏ lỡ công việc khẩn cấp!</span>
              <button
                onClick={requestNotificationPermission}
                className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-colors shadow-sm"
              >
                Bật ngay
              </button>
            </div>
          )}

          {displayTasks.length === 0 ? (
            <div className="text-center text-slate-500 mt-10 font-medium">Không có công việc nào.</div>
          ) : (
            <>
              {overdue.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Quá hạn ({overdue.length})
                  </h3>
                  {sortTasks(overdue).map(task => <TaskCard key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} />)}
                </div>
              )}
              {dueSoon.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Sắp đến hạn ({dueSoon.length})
                  </h3>
                  {sortTasks(dueSoon).map(task => <TaskCard key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} />)}
                </div>
              )}
              {active.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đang thực hiện ({active.length})
                  </h3>
                  {sortTasks(active).map(task => <TaskCard key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} />)}
                </div>
              )}
              {completed.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span> Đã hoàn thành ({completed.length})
                  </h3>
                  {sortTasks(completed).map(task => <TaskCard key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskDetail task={selectedTask} onBack={() => setSelectedTaskId(null)} />
      )}
    </>
  );
};

const TaskCard: React.FC<{ task: Task, onClick: () => void }> = ({ task, onClick }) => {
  const { updateTaskStatus, comments, showToast, currentUser } = useAppContext();
  
  const isReport = !!task.reportTemplate;
  const hasSubmittedReport = isReport && !!task.submissions?.find(r => r.userId === currentUser?.id);
  const isDone = task.status === 'done' || hasSubmittedReport;
  const isOverdue = !isDone && task.deadline && isPast(parseISO(task.deadline));
  const isDueSoon = !isDone && !isOverdue && task.deadline && differenceInDays(parseISO(task.deadline), new Date()) <= 2;
  const isDueToday = !isDone && task.deadline && new Date().toDateString() === parseISO(task.deadline).toDateString();

  const commentCount = comments.filter(c => c.taskId === task.id).length;

  const toggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReport) return;
    
    const oldStatus = task.status;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateTaskStatus(task.id, newStatus);
    showToast(
      newStatus === 'done' ? 'Đã đánh dấu hoàn thành' : 'Đã chuyển về chưa làm',
      () => updateTaskStatus(task.id, oldStatus)
    );
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl shadow-sm border-l-[6px] border border-y-slate-200 border-r-slate-200 p-4 active:scale-[0.99] transition-all cursor-pointer relative overflow-hidden",
        isDone ? "border-l-slate-400 opacity-70 bg-slate-50/50" : 
        task.isUrgent ? "border-l-rose-500 border-rose-300 ring-2 ring-rose-500 ring-offset-1 bg-white hover:bg-rose-50 shadow-[0_4px_12px_rgba(244,63,94,0.1)]" :
        // Highlight: red overdue, yellow due soon
        isOverdue ? "border-l-rose-500 border-y-rose-200 border-r-rose-200 bg-rose-50/50 hover:bg-rose-50" :
        isDueSoon ? "border-l-amber-500 border-y-amber-200 border-r-amber-200 bg-amber-50/50 hover:bg-amber-50" :
        "border-l-emerald-500 border-y-emerald-200 border-r-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:shadow-md"
      )}
    >
      <div className="flex justify-between items-start mb-2.5 flex-wrap gap-2">
        <div className="flex gap-2">
          <span className={cn(
            "px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider shadow-sm flex items-center gap-1",
            isReport ? (hasSubmittedReport ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700") :
            task.status === 'todo' ? "bg-slate-100 text-slate-600" :
            task.status === 'doing' ? "bg-amber-100 text-amber-700" :
            "bg-slate-200 text-slate-600"
          )}>
            {task.isUrgent && !isDone && <Zap className="w-3 h-3 text-rose-500 fill-rose-500" />}
            {isReport ? (hasSubmittedReport ? 'Đã nộp báo cáo' : 'Cần nộp báo cáo') : 
             task.status === 'todo' ? 'Chưa làm' : task.status === 'doing' ? 'Đang làm' : 'Đã xong'}
          </span>
          {isDueToday && (
            <span className="px-2 py-0.5 text-[9px] font-bold text-white bg-rose-500 rounded uppercase tracking-wider shadow-sm flex items-center gap-1 animate-pulse">
              Hôm nay
            </span>
          )}
        </div>
        
        {task.deadline && (
          <div className={cn("text-[10px] font-bold tracking-wide flex items-center gap-1", isOverdue ? "text-rose-500" : "text-slate-400 italic")}>
            <Clock className="w-3 h-3" />
            {format(parseISO(task.deadline), 'HH:mm - dd/MM')}
          </div>
        )}
      </div>

      <div className="flex gap-3 items-start mt-1">
        {isReport ? (
          <div className="mt-0.5 flex-shrink-0 text-slate-400 z-10">
            {hasSubmittedReport ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <FileText className="w-5 h-5 text-rose-400" />}
          </div>
        ) : (
          <button onClick={toggleStatus} className="mt-0.5 flex-shrink-0 text-slate-300 hover:text-indigo-600 transition-colors z-10">
            {task.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5" />}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "text-sm font-bold leading-tight pr-2", 
            (task.status === 'done' || hasSubmittedReport) ? "line-through text-slate-500" : 
            isOverdue ? "text-rose-600" : "text-slate-800"
          )}>
            {task.title}
          </h3>
          <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 pr-2 leading-relaxed">
            {task.description}
          </p>
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
        {(task.status === 'done' || hasSubmittedReport) && (
          <span className="text-emerald-600 italic normal-case font-medium">✓ Hoàn thành</span>
        )}
      </div>
    </div>
  );
};

