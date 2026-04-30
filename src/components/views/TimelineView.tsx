import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Task } from '../../types';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { CheckCircle2, Circle, Clock, FileText, CalendarDays } from 'lucide-react';
import { cn } from '../../utils';
import { TaskDetail } from './TaskDetail';

export const TimelineView: React.FC = () => {
  const { tasks, currentUser } = useAppContext();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // 2. relevant tasks
  const relevantTasks = tasks.filter(t => {
    if (t.category !== 'task') return false;
    const isCreator = t.createdBy === currentUser?.id;
    const isAssigned = t.assignedTo?.includes(currentUser?.id || '');
    const isRole = t.targetRoles?.includes(currentUser?.role || '');
    const isDept = t.targetDepartments?.includes(currentUser?.department || '');
    const isGrade = t.targetGrades?.includes(currentUser?.grade || '');
    return !!(isCreator || isAssigned || isRole || isDept || isGrade);
  });

  const displayTasks = relevantTasks.filter(t => {
    const isReport = !!(t as any).reportTemplate;
    const isDone = t.status === 'done' || (isReport && !!t.submissions?.find(r => r.userId === currentUser?.id));
    return showCompleted || !isDone;
  });

  const getUrgency = (task: Task) => {
    if (!task.deadline) return 0;
    const pDate = new Date(task.deadline);
    if (isPast(pDate) && !isToday(pDate)) return -1; // overdue
    if (isToday(pDate)) return 1;
    if (isTomorrow(pDate)) return 2;
    const diff = differenceInDays(pDate, new Date());
    if (diff <= 7) return 3; // this week
    return 4; // later
  };

  const overdue: Task[] = [];
  const today: Task[] = [];
  const tomorrow: Task[] = [];
  const thisWeek: Task[] = [];
  const later: Task[] = [];

  displayTasks.forEach(task => {
    const u = getUrgency(task);
    if (u === -1) overdue.push(task);
    else if (u === 1) today.push(task);
    else if (u === 2) tomorrow.push(task);
    else if (u === 3) thisWeek.push(task);
    else later.push(task);
  });

  const sortTasks = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  };

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  const toggleStatus = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    // In our simplified structure we don't implement the toggle here, just view.
    // Or we can call AppContext updateTaskStatus if needed, but the prompt asks for UI simple vertical list.
  };

  return (
    <>
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white p-4 shadow-sm z-10 sticky top-0 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-600" />
              Tiến độ
            </h2>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                checked={showCompleted}
                onChange={e => setShowCompleted(e.target.checked)}
              />
              Đã xong
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {displayTasks.length === 0 ? (
            <div className="text-center text-slate-500 mt-10 font-medium">Không có công việc nào.</div>
          ) : (
            <>
              {overdue.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Quá hạn ({overdue.length})
                  </h3>
                  {sortTasks(overdue).map(task => <TimelineCard key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} isOverdue />)}
                </div>
              )}
              {today.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Hôm nay ({today.length})
                  </h3>
                  {sortTasks(today).map(task => <TimelineCard key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} isToday />)}
                </div>
              )}
              {tomorrow.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Ngày mai ({tomorrow.length})
                  </h3>
                  {sortTasks(tomorrow).map(task => <TimelineCard key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} />)}
                </div>
              )}
              {thisWeek.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Tuần này ({thisWeek.length})
                  </h3>
                  {sortTasks(thisWeek).map(task => <TimelineCard key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} />)}
                </div>
              )}
              {later.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span> Sắp tới ({later.length})
                  </h3>
                  {sortTasks(later).map(task => <TimelineCard key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} />)}
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

interface TimelineCardProps {
  task: Task;
  onClick: () => void;
  isOverdue?: boolean;
  isToday?: boolean;
}

const TimelineCard: React.FC<TimelineCardProps> = ({ task, onClick, isOverdue = false, isToday = false }) => {
  const { currentUser } = useAppContext();
  const isReport = !!(task as any).reportTemplate;
  const hasSubmittedReport = task.submissions?.some(r => r.userId === currentUser?.id);
  const isDone = task.status === 'done' || (isReport && hasSubmittedReport);

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl shadow-sm border p-3 flex gap-3 transition-all cursor-pointer",
        isDone ? "opacity-60 bg-slate-50/50 grayscale-[50%]" : "",
        isOverdue && !isDone ? "border-rose-200 bg-rose-50/30" : "border-slate-100"
      )}
    >
      <div className="mt-0.5 flex-shrink-0 text-slate-300">
        {isReport ? (
          hasSubmittedReport ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <FileText className="w-5 h-5 text-indigo-400" />
        ) : (
          isDone ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          "text-sm leading-tight pr-2", 
          isDone ? "line-through text-slate-500 font-medium" : 
          isOverdue ? "text-rose-700 font-bold" : 
          isToday ? "text-slate-900 font-bold" : "text-slate-800 font-semibold"
        )}>
          {task.title}
        </h4>
        {task.deadline && (
          <div className={cn(
            "flex items-center gap-1 mt-1.5 text-xs font-semibold",
            isOverdue && !isDone ? "text-rose-500" :
            isToday && !isDone ? "text-amber-500" : "text-slate-400"
          )}>
            <Clock className="w-3.5 h-3.5" />
            {format(new Date(task.deadline), 'HH:mm - dd/MM/yyyy')}
          </div>
        )}
      </div>
    </div>
  );
};
