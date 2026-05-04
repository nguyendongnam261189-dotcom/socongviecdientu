import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { PieChart, TrendingUp, AlertCircle, FileText, CheckCircle2, Plus, Users as UsersIcon, Bell, Zap } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { TaskForm } from './TaskForm';
import { TaskDetail } from './TaskDetail';
import { cn, isTaskVisible } from '../../utils'; // ĐÃ BỎ getUserDepts VÌ KHÔNG CÒN CẦN THIẾT

export const DashboardView: React.FC = () => {
  const { tasks: allTasks, users, currentUser, setActiveTab, showToast, toggleTaskUrgent } = useAppContext();
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

  // CHUẨN HÓA LẠI: Thống kê tốc độ cao theo TỔ CHUYÊN MÔN (department là string)
  // 1. Lấy tất cả các tổ đang có thật trong hệ thống
  const allDeptsInUse = users.map(u => typeof u.department === 'string' ? u.department : (Array.isArray(u.department) ? u.department[0] : 'Khác')).filter(Boolean);
  const departments = Array.from(new Set(allDeptsInUse)).filter(d => d !== 'BGH' && d !== 'Chưa phân bổ');
  
  const deptStats = departments.map(dept => {
    // 2. Lấy những người thuộc đúng tổ này
    const deptUsers = users.filter(u => {
       const uDept = typeof u.department === 'string' ? u.department : (Array.isArray(u.department) ? u.department[0] : 'Khác');
       return uDept === dept;
    }).map(u => u.id);
    
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

  // Pending tasks and users who haven't submitted
  const pendingTasks = tasks.filter(t => t.status !== 'done').map(t => {
    let pendingUids: string[] = (t.assignedTo || []).filter(uid => !t.submissions?.some(s => s.userId === uid && (!s.status || s.status === 'done')));
    return { ...t, pendingUids };
  }).filter(t => t.pendingUids.length > 0);

  // Completed tasks and users who have submitted
  const completedTasks = tasks.map(t => {
    let doneUids: string[] = (t.assignedTo || []).filter(uid => t.submissions?.some(s => s.userId === uid && (!s.status || s.status === 'done')));
    return { ...t, doneUids, isFullyDone: t.status === 'done' || (doneUids.length > 0 && doneUids.length === (t.assignedTo?.length || 0)) };
  }).filter(t => t.doneUids.length > 0 || t.status === 'done');

  // --- HÀM 1: CÁI CHUÔNG (NHẮC RIÊNG TỪNG NGƯỜI) ---
  const handleRemind = async (e: React.MouseEvent, uid: string, taskTitle: string) => {
    e.stopPropagation();
    const user = users.find(u => u.id === uid);
    if (!user?.fcmTokens || user.fcmTokens.length === 0) {
      alert(`Giáo viên ${user?.name || ''} chưa bật thông báo!`);
      return;
    }
    try {
      showToast(`Đang gửi nhắc nhở đến ${user.name}...`);
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: user.fcmTokens,
          title: '🔔 Nhắc nhở công việc',
          body: `Công việc "${taskTitle}" đang chờ bạn xử lý!`
        })
      });
      showToast(`Đã nhắc nhở ${user.name} thành công!`);
    } catch (err) {
      console.error(err);
      showToast("Lỗi gửi thông báo");
    }
  };

  // --- HÀM 2: TIA SÉT (BẬT KHUNG ĐỎ + NHẮC TOÀN BỘ NGƯỜI CHƯA XONG) ---
  const handleToggleUrgent = async (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    toggleTaskUrgent(task.id);
    
    // Nếu task đang bình thường -> bật Khẩn cấp (khung đỏ), thì gom Token báo động
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
        } catch (err) {
          console.error(err);
        }
      }
    }
    showToast(`Đã thay đổi trạng thái khẩn cấp`);
  };

  if (showTaskForm) {
    return <TaskForm onBack={() => setShowTaskForm(false)} />;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto p-4 space-y-6 pb-20">
      
      {/* Quick Actions */}
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
             <div className="p-6 text-center text-slate-400 text-xs">Chưa có dữ liệu thống kê tổ/nhóm.</div>
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
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> Danh sách công việc
          </h3>
          <div className="flex bg-slate-200 p-1 rounded-lg">
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
              Đã hoàn thành
            </button>
          </div>
        </div>

        {listFilter === 'pending' && pendingTasks.length > 0 && (
          <div className="space-y-3">
            {pendingTasks.map(task => {
              const overdue = task.deadline && isPast(parseISO(task.deadline));
              
              return (
                <div 
                  key={task.id} 
                  onClick={() => setSelectedTaskId(task.id)}
                  className={cn(
                     "bg-white p-3.5 rounded-2xl shadow-sm border relative overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-[0.99]",
                     overdue ? "border-rose-100 border-l-4 border-l-rose-500" : "border-slate-200 border-l-4 border-l-amber-500",
                     task.isUrgent && "ring-2 ring-rose-500 ring-offset-2"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                     <h4 className="font-bold text-sm text-slate-800 pr-2 line-clamp-2">{task.title}</h4>
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
                  </div>
                  
                  <div className="mt-1 mb-3 text-[10px] uppercase font-bold tracking-wider">
                     {overdue ? (
                        <span className="text-rose-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Trễ hạn ({task.deadline ? format(parseISO(task.deadline), 'dd/MM') : ''})</span>
                     ) : (
                        <span className="text-amber-600">Đang thực hiện</span>
                     )}
                  </div>

                  <div className="space-y-1.5">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Danh sách chưa hoàn thành:</p>
                     <div className="flex flex-col gap-1.5">
                        {task.pendingUids.map(uid => {
                           const user = users.find(u => u.id === uid);
                           if (!user) return null;
                           const uDept = typeof user.department === 'string' ? user.department : (Array.isArray(user.department) ? user.department[0] : 'Khác');
                           return (
                              <div key={uid} className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                                 <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700">{user.name}</span>
                                    <span className="text-[9px] text-slate-500 line-clamp-1">
                                      {uDept}
                                      {user.groups && user.groups.length > 0 && <span className="text-indigo-500 font-medium"> • Nhóm: {user.groups.join(', ')}</span>}
                                    </span>
                                 </div>
                                 <button 
                                    onClick={(e) => handleRemind(e, uid, task.title)}
                                    className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors z-10 shrink-0 ml-2"
                                    title="Nhắc nhở"
                                 >
                                    <Bell className="w-3.5 h-3.5" />
                                 </button>
                              </div>
                           )
                        })}
                     </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {listFilter === 'pending' && pendingTasks.length === 0 && (
          <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 border-dashed">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-50" />
            <p className="text-slate-500 text-sm font-medium">Tuyệt vời! Không có ai bị trễ hoặc ngâm việc.</p>
          </div>
        )}

        {listFilter === 'done' && completedTasks.length > 0 && (
          <div className="space-y-3">
            {completedTasks.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => setSelectedTaskId(task.id)}
                  className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500 relative overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
                >
                  <div className="flex justify-between items-start mb-2">
                     <h4 className="font-bold text-sm text-slate-800 pr-2 line-clamp-2">{task.title}</h4>
                     {task.isFullyDone && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                  </div>
                  
                  <div className="space-y-1.5">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đã hoàn thành / nộp báo cáo:</p>
                     <div className="flex flex-col gap-1.5">
                        {task.doneUids.map(uid => {
                           const user = users.find(u => u.id === uid);
                           if (!user) return null;
                           const uDept = typeof user.department === 'string' ? user.department : (Array.isArray(user.department) ? user.department[0] : 'Khác');
                           return (
                              <div key={uid} className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                                 <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700">{user.name}</span>
                                    <span className="text-[9px] text-slate-500 line-clamp-1">
                                      {uDept}
                                      {user.groups && user.groups.length > 0 && <span className="text-indigo-500 font-medium"> • Nhóm: {user.groups.join(', ')}</span>}
                                    </span>
                                 </div>
                                 <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />
                              </div>
                           )
                        })}
                     </div>
                  </div>
                </div>
            ))}
          </div>
        )}

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
