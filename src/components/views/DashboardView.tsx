import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { PieChart, TrendingUp, AlertCircle, FileText, CheckCircle2, Plus, Users as UsersIcon, Zap, Clock } from 'lucide-react';
import { format, isPast, parseISO, differenceInDays, isThisMonth } from 'date-fns';
import { TaskForm } from './TaskForm';
import { TaskDetail } from './TaskDetail';
import { cn, isTaskVisible } from '../../utils';

export const DashboardView: React.FC = () => {
  const { tasks: allTasks, users, currentUser, setActiveTab, toggleTaskUrgent, showToast } = useAppContext();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<'pending' | 'done'>('pending');

  const tasks = allTasks.filter(t => isTaskVisible(t, currentUser, users) && t.category === 'task');

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => {
    if (t.status === 'done') return true;
    if (!t.assignedTo || t.assignedTo.length === 0) return false;
    return t.assignedTo.every(uid => t.submissions?.some(s => s.userId === uid && (!s.status || s.status === 'done')));
  }).length;
  
  const completionRate = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
  const overdueTasks = tasks.filter(t => t.deadline && t.status !== 'done' && isPast(parseISO(t.deadline)));

  // Thống kê theo tổ chuyên môn
  const allDeptsInUse = users.map(u => typeof u.department === 'string' ? u.department : (Array.isArray(u.department) ? u.department[0] : 'Khác')).filter(Boolean);
  const departments = Array.from(new Set(allDeptsInUse)).filter(d => d !== 'BGH' && d !== 'Chưa phân bổ');
  
  const deptStats = departments.map(dept => {
    const deptUsers = users.filter(u => (typeof u.department === 'string' ? u.department : (Array.isArray(u.department) ? u.department[0] : 'Khác')) === dept).map(u => u.id);
    const deptTasks = tasks.filter(t => t.assignedTo?.some(uid => deptUsers.includes(uid)));
    const deptDone = deptTasks.filter(t => {
      if (t.status === 'done') return true;
      const assignedInDept = t.assignedTo?.filter(uid => deptUsers.includes(uid)) || [];
      if (assignedInDept.length === 0) return true;
      return assignedInDept.every(uid => t.submissions?.some(s => s.userId === uid && (!s.status || s.status === 'done')));
    }).length;
    const deptOverdue = deptTasks.filter(t => t.deadline && t.status !== 'done' && isPast(parseISO(t.deadline))).length;
    const rate = deptTasks.length === 0 ? 0 : Math.round((deptDone / deptTasks.length) * 100);
    return { name: dept, total: deptTasks.length, done: deptDone, overdue: deptOverdue, rate };
  });

  const pendingTasks = tasks.filter(t => t.status !== 'done').map(t => {
    let pendingUids: string[] = (t.assignedTo || []).filter(uid => !t.submissions?.some(s => s.userId === uid && (!s.status || s.status === 'done')));
    return { ...t, pendingUids };
  }).filter(t => t.pendingUids.length > 0);

  const completedTasks = tasks.map(t => {
    let doneUids: string[] = (t.assignedTo || []).filter(uid => t.submissions?.some(s => s.userId === uid && (!s.status || s.status === 'done')));
    return { ...t, doneUids, isFullyDone: t.status === 'done' || (doneUids.length > 0 && doneUids.length === (t.assignedTo?.length || 0)) };
  }).filter(t => t.doneUids.length > 0 || t.status === 'done');

  // HÀM NHÓM CÔNG VIỆC THEO THỜI GIAN
  const groupTasksByTime = (taskList: any[]) => {
    const today = new Date();
    const groups: Record<string, any[]> = { 'Mới nhất (7 ngày qua)': [], 'Tháng này': [], 'Cũ hơn': [] };
    
    taskList.forEach(t => {
      const d = parseISO(t.createdAt);
      if (differenceInDays(today, d) <= 7) groups['Mới nhất (7 ngày qua)'].push(t);
      else if (isThisMonth(d)) groups['Tháng này'].push(t);
      else groups['Cũ hơn'].push(t);
    });
    return groups;
  };

  const handleToggleUrgent = async (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    toggleTaskUrgent(task.id);
    if (!task.isUrgent) {
      const tokens: string[] = [];
      task.pendingUids.forEach((uid: string) => {
        const u = users.find(user => user.id === uid);
        if (u?.fcmTokens) tokens.push(...u.fcmTokens);
      });
      if (tokens.length > 0) {
        try {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokens,
              title: '⚡ THÔNG BÁO KHẨN CẤP',
              body: `Công việc "${task.title}" vừa được đánh dấu RẤT GẤP! Đề nghị hoàn thành ngay!`
            })
          });
          showToast(`Đã bật khẩn cấp và báo động cho ${task.pendingUids.length} người!`);
          return;
        } catch (err) { console.error(err); }
      }
    }
    showToast(`Đã thay đổi trạng thái khẩn cấp`);
  };

  if (showTaskForm) {
    return <TaskForm onBack={() => setShowTaskForm(false)} />;
  }

  const renderTaskCard = (task: any, isPending: boolean) => {
    const overdue = isPending && task.deadline && isPast(parseISO(task.deadline));
    const totalAssigned = task.assignedTo?.length || 0;
    const pendingCount = isPending ? task.pendingUids.length : 0;
    const doneCount = totalAssigned - pendingCount;

    return (
      <div 
        key={task.id} 
        onClick={() => setSelectedTaskId(task.id)}
        className={cn(
           "bg-white p-3.5 rounded-2xl shadow-sm border relative overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-[0.99]",
           isPending ? (overdue ? "border-rose-100 border-l-4 border-l-rose-500" : "border-slate-200 border-l-4 border-l-amber-500") : "border-slate-200 border-l-4 border-l-emerald-500",
           task.isUrgent && isPending && "ring-2 ring-rose-500 ring-offset-2"
        )}
      >
        <div className="flex justify-between items-start mb-2">
           <h4 className="font-bold text-sm text-slate-800 pr-2 line-clamp-2">{task.title}</h4>
           {isPending ? (
             <button
                onClick={(e) => handleToggleUrgent(e, task)}
                className={cn(
                   "p-1.5 rounded-md flex-shrink-0 transition-colors z-10",
                   task.isUrgent ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                )}
                title="Đánh dấu khẩn cấp"
             >
                <Zap className={cn("w-4 h-4", task.isUrgent && "fill-rose-500")} />
             </button>
           ) : (
             <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
           )}
        </div>
        
        <div className="mt-1 mb-3 text-[10px] uppercase font-bold tracking-wider flex items-center justify-between">
           {isPending ? (
             overdue ? (
                <span className="text-rose-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Trễ hạn ({task.deadline ? format(parseISO(task.deadline), 'dd/MM') : ''})</span>
             ) : (
                <span className="text-amber-600">Đang thực hiện</span>
             )
           ) : (
             <span className="text-emerald-600">Đã hoàn thành</span>
           )}
           <span className="text-slate-400 flex items-center gap-1 normal-case font-medium">
             <Clock className="w-3 h-3" /> {format(parseISO(task.createdAt), 'dd/MM')}
           </span>
        </div>

        {/* THU GỌN DANH SÁCH: Chỉ hiển thị thanh tóm tắt tiến độ */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
           <div className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
               {isPending ? 'Tiến độ nộp bài' : 'Đã nộp'}
             </span>
             <span className="text-sm font-black text-slate-700">
               {doneCount} / {totalAssigned} <span className="text-xs font-medium text-slate-500">người</span>
             </span>
           </div>
           
           {isPending && (
             <div className="text-right flex flex-col items-end">
               <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1">Chờ xử lý</span>
               <span className="text-sm font-black text-rose-600">{pendingCount}</span>
             </div>
           )}
        </div>
        <div className="mt-2 text-center">
           <span className="text-[10px] text-indigo-500 font-medium hover:underline">Bấm để xem chi tiết & đôn đốc &rarr;</span>
        </div>
      </div>
    );
  };

  const renderTaskGroups = (tasksToGroup: any[], isPending: boolean) => {
    const grouped = groupTasksByTime(tasksToGroup);
    return Object.entries(grouped).map(([groupName, groupTasks]) => {
      if (groupTasks.length === 0) return null;
      return (
        <div key={groupName} className="space-y-3 mb-6">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{groupName}</h4>
          {groupTasks.map(t => renderTaskCard(t, isPending))}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto p-4 space-y-6 pb-20">
      
      {(currentUser?.role === 'admin' || currentUser?.role === 'leader') && (
        <div className="flex gap-2 mb-2">
          <button 
            onClick={() => setShowTaskForm(true)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-2xl shadow-md shadow-indigo-600/20 flex flex-col items-center justify-center transition-all"
          >
            <Plus className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Tạo Công Việc</span>
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 p-3 rounded-2xl shadow-sm flex flex-col items-center justify-center transition-all"
          >
            <UsersIcon className="w-6 h-6 mb-1 text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Nhân Sự</span>
          </button>
        </div>
      )}

      {/* Cụm thống kê tổng quan */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
            <FileText className="w-3 h-3" /> Tổng nhiệm vụ
          </span>
          <div className="text-3xl font-black text-slate-700 my-1">{totalTasks}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3" /> Tiến độ chung
          </span>
          <div className="text-3xl font-black text-indigo-600 my-1">{completionRate}%</div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center text-center col-span-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
            <AlertCircle className="w-3 h-3" /> Trễ hạn
          </span>
          <div className="text-3xl font-black text-rose-500 my-1">{overdueTasks.length}</div>
          <p className="text-[9px] text-slate-400 font-medium">CẦN ĐÔN ĐỐC</p>
        </div>
      </div>

      {/* Thống kê theo tổ */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1 flex items-center gap-1.5">
          <PieChart className="w-4 h-4" /> Thống kê theo tổ chuyên môn
        </h3>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {deptStats.length === 0 ? (
             <div className="p-6 text-center text-slate-400 text-xs">Chưa có dữ liệu thống kê tổ chuyên môn.</div>
          ) : (
            deptStats.map((dept, idx) => (
              <div key={dept.name} className={`p-4 ${idx !== deptStats.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-sm text-slate-700">{dept.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {dept.done}/{dept.total} Hoàn thành
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${dept.rate >= 80 ? 'bg-emerald-500' : dept.rate >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`} 
                      style={{ width: `${dept.rate}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-black text-slate-700 w-8 text-right">{dept.rate}%</span>
                </div>
                {dept.overdue > 0 && (
                  <div className="mt-2 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded inline-block">
                    {dept.overdue} việc trễ hạn
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Task Lists with Tabs */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-3 sticky top-0 bg-slate-50 py-2 z-10">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> Danh sách việc
          </h3>
          <div className="flex bg-slate-200 p-1 rounded-lg shadow-inner">
            <button
              onClick={() => setListFilter('pending')}
              className={cn("px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all", listFilter === 'pending' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Cần đôn đốc
            </button>
            <button
              onClick={() => setListFilter('done')}
              className={cn("px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all", listFilter === 'done' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Hoàn thành
            </button>
          </div>
        </div>

        {listFilter === 'pending' && pendingTasks.length > 0 && renderTaskGroups(pendingTasks, true)}
        {listFilter === 'pending' && pendingTasks.length === 0 && (
          <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 border-dashed">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-50" />
            <p className="text-slate-500 text-sm font-medium">Tuyệt vời! Không có ai bị trễ hoặc ngâm việc.</p>
          </div>
        )}

        {listFilter === 'done' && completedTasks.length > 0 && renderTaskGroups(completedTasks, false)}
        {listFilter === 'done' && completedTasks.length === 0 && (
          <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 border-dashed">
             <p className="text-slate-500 text-sm font-medium">Chưa có công việc nào hoàn thành.</p>
          </div>
        )}
      </div>

      {selectedTaskId && (
        <TaskDetail task={allTasks.find(t => t.id === selectedTaskId)!} onBack={() => setSelectedTaskId(null)} />
      )}
    </div>
  );
};
