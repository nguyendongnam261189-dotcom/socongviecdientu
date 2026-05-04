import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { FileText, CheckCircle2, Plus, Zap, Clock, Search, Filter, AlertCircle, FileSpreadsheet, Megaphone } from 'lucide-react';
import { format, isPast, parseISO, differenceInDays, isThisMonth } from 'date-fns';
import { TaskForm } from './TaskForm';
import { TaskDetail } from './TaskDetail';
import { cn, isTaskVisible } from '../../utils';

export const DashboardView: React.FC = () => {
  const { tasks: allTasks, users, currentUser, toggleTaskUrgent, showToast } = useAppContext();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Các State cho Bộ lọc và Tìm kiếm
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'task' | 'announcement' | 'poll'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'running' | 'closed'>('running');

  // Lấy ra tất cả các "Công việc, Thông báo, Khảo sát" mà user này ĐƯỢC PHÉP THẤY 
  // (Đã áp dụng màng lọc 'Có đánh giá tiến độ' bên trong utils.ts)
  const visibleTasks = allTasks.filter(t => isTaskVisible(t, currentUser, users));

  // Lọc thêm một bước nữa theo Search và Filter
  const filteredTasks = visibleTasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'all' ? true : t.category === filterType;
    const matchStatus = filterStatus === 'all' ? true : (filterStatus === 'running' ? t.status !== 'done' : t.status === 'done');
    return matchSearch && matchType && matchStatus;
  });

  // Tính toán số liệu tổng quan (Dựa trên mảng đã được lọc ở trên)
  const totalTasks = filteredTasks.length;
  const closedTasks = filteredTasks.filter(t => t.status === 'done').length;
  const overdueTasks = filteredTasks.filter(t => t.deadline && t.status !== 'done' && isPast(parseISO(t.deadline))).length;

  // HÀM TÍNH TOÁN TIẾN ĐỘ MINI CHO TỪNG THẺ (Card)
  const getTaskProgress = (task: any) => {
    const totalAssigned = task.assignedTo?.length || 0;
    if (totalAssigned === 0) return { doneCount: 0, pendingCount: 0, total: 0 };

    let doneCount = 0;
    
    if (task.category === 'task') {
      // Đối với Công việc: Đếm số người nộp bài (submission)
      doneCount = task.assignedTo.filter((uid: string) => task.submissions?.some((s: any) => s.userId === uid && (!s.status || s.status === 'done'))).length;
    } else if (task.category === 'announcement') {
      // Đối với Thông báo: Đếm số người đã xem (readBy)
      doneCount = task.readBy?.length || 0;
    } else if (task.category === 'poll') {
      // Đối với Khảo sát: Đếm số người đã chọn option
      const votedUids = new Set<string>();
      task.pollOptions?.forEach((opt: any) => opt.votes?.forEach((uid: string) => votedUids.add(uid)));
      doneCount = votedUids.size;
    }

    return { 
      doneCount, 
      pendingCount: totalAssigned - doneCount, 
      total: totalAssigned 
    };
  };

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

  // Nút Khẩn Cấp (Chỉ dành cho Task)
  const handleToggleUrgent = async (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    if (task.category !== 'task') return; // Không báo động khẩn cấp cho thông báo/khảo sát

    toggleTaskUrgent(task.id);
    if (!task.isUrgent) {
      // Lọc ra những người CHƯA LÀM
      const pendingUids = task.assignedTo?.filter((uid: string) => !task.submissions?.some((s: any) => s.userId === uid && (!s.status || s.status === 'done'))) || [];
      const tokens: string[] = [];
      pendingUids.forEach((uid: string) => {
        const u = users.find(user => user.id === uid);
        if (u?.fcmTokens) tokens.push(...(Array.isArray(u.fcmTokens) ? u.fcmTokens : [u.fcmTokens]));
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
          showToast(`Đã bật khẩn cấp và báo động cho ${pendingUids.length} người!`);
          return;
        } catch (err) { console.error(err); }
      }
    }
    showToast(`Đã thay đổi trạng thái khẩn cấp`);
  };

  if (showTaskForm) {
    return <TaskForm onBack={() => setShowTaskForm(false)} />;
  }

  const renderTaskCard = (task: any) => {
    const isRunning = task.status !== 'done';
    const isOverdue = isRunning && task.deadline && isPast(parseISO(task.deadline));
    const { doneCount, total } = getTaskProgress(task);
    
    // Tùy chỉnh Icon & Màu sắc theo Loại
    let CatIcon = FileText;
    let catLabel = "Công việc";
    let catColor = "text-indigo-600 bg-indigo-50 border-indigo-100";
    
    if (task.category === 'announcement') {
      CatIcon = Megaphone;
      catLabel = "Thông báo";
      catColor = "text-sky-600 bg-sky-50 border-sky-100";
    } else if (task.category === 'poll') {
      CatIcon = FileSpreadsheet;
      catLabel = "Khảo sát";
      catColor = "text-amber-600 bg-amber-50 border-amber-100";
    }

    return (
      <div 
        key={task.id} 
        onClick={() => setSelectedTaskId(task.id)}
        className={cn(
           "bg-white p-3.5 rounded-2xl shadow-sm border relative overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-[0.99]",
           isRunning ? (isOverdue ? "border-rose-100 border-l-4 border-l-rose-500" : "border-slate-200") : "border-slate-200 opacity-70",
           task.isUrgent && isRunning && task.category === 'task' && "ring-2 ring-rose-500 ring-offset-2"
        )}
      >
        {/* Nhãn Phân loại */}
        <div className="flex justify-between items-start mb-2">
           <div className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border", catColor)}>
              <CatIcon className="w-3 h-3" /> {catLabel}
           </div>
           
           {isRunning && task.category === 'task' && (
             <button
                onClick={(e) => handleToggleUrgent(e, task)}
                className={cn("p-1.5 rounded-md flex-shrink-0 transition-colors z-10", task.isUrgent ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400 hover:bg-slate-200")}
                title="Đánh dấu khẩn cấp"
             >
                <Zap className={cn("w-4 h-4", task.isUrgent && "fill-rose-500")} />
             </button>
           )}
           {!isRunning && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
        </div>
        
        {/* Tiêu đề */}
        <h4 className={cn("font-bold text-sm pr-2 line-clamp-2", !isRunning ? "text-slate-500 line-through" : "text-slate-800")}>{task.title}</h4>
        
        {/* Trạng thái & Hạn chót */}
        <div className="mt-2 mb-3 text-[10px] font-bold tracking-wider flex items-center justify-between">
           {isRunning ? (
             isOverdue ? (
                <span className="text-rose-500 flex items-center gap-1 uppercase"><AlertCircle className="w-3 h-3"/> Đã quá hạn</span>
             ) : (
                <span className="text-emerald-600 flex items-center gap-1 uppercase"><Clock className="w-3 h-3"/> Đang mở</span>
             )
           ) : (
             <span className="text-slate-400 uppercase">Đã đóng / Kết thúc</span>
           )}
           
           {task.deadline && (
              <span className={cn("px-2 py-0.5 rounded border font-medium", isOverdue && isRunning ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-slate-50 border-slate-100 text-slate-500")}>
                Hạn: {format(parseISO(task.deadline), 'HH:mm - dd/MM')}
              </span>
           )}
        </div>

        {/* Thanh tiến độ mini */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
           <div className="flex justify-between items-center mb-1.5">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiến độ chung</span>
             <span className="text-xs font-black text-slate-700">{doneCount} / {total}</span>
           </div>
           <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
             <div 
               className={cn("h-full rounded-full transition-all duration-500", !isRunning ? "bg-slate-400" : (doneCount === total && total > 0 ? "bg-emerald-500" : "bg-indigo-500"))} 
               style={{ width: `${total === 0 ? 0 : (doneCount/total)*100}%` }}
             ></div>
           </div>
        </div>
      </div>
    );
  };

  const groupedTasks = groupTasksByTime(filteredTasks);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto p-4 space-y-6 pb-24">
      
      {/* NÚT TẠO MỚI (CHỈ ADMIN/LEADER MỚI THẤY) */}
      {(currentUser?.role === 'admin' || currentUser?.role === 'leader') && (
        <button 
          onClick={() => setShowTaskForm(true)}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          <span className="font-bold tracking-wide">TẠO NỘI DUNG MỚI</span>
        </button>
      )}

      {/* CỤM THỐNG KÊ NHANH (THAY THẾ BIỂU ĐỒ CŨ BẰNG CON SỐ TRỰC QUAN) */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
          <span className="text-2xl font-black text-slate-700">{totalTasks}</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Tổng số việc</span>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
          <span className="text-2xl font-black text-emerald-500">{closedTasks}</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Đã đóng</span>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
          <span className="text-2xl font-black text-rose-500">{overdueTasks}</span>
          <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider mt-1">Quá hạn</span>
        </div>
      </div>

      {/* KHU VỰC ĐIỀU KHIỂN & BỘ LỌC */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 space-y-3 sticky top-0 z-10">
         {/* Ô Tìm kiếm */}
         <div className="relative">
           <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
           <input 
             type="text" 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             placeholder="Tìm kiếm công việc, thông báo..."
             className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 transition-colors"
           />
         </div>
         
         {/* Các nút Lọc */}
         <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
           <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
             <button onClick={() => setFilterStatus('running')} className={cn("px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all", filterStatus === 'running' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500")}>Đang chạy</button>
             <button onClick={() => setFilterStatus('closed')} className={cn("px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all", filterStatus === 'closed' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500")}>Đã Đóng</button>
             <button onClick={() => setFilterStatus('all')} className={cn("px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all", filterStatus === 'all' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500")}>Tất cả</button>
           </div>
           
           <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
             <button onClick={() => setFilterType('all')} className={cn("px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all", filterType === 'all' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}><Filter className="w-3 h-3 inline-block" /> Loại</button>
             <button onClick={() => setFilterType('task')} className={cn("px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all", filterType === 'task' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}>Công việc</button>
             <button onClick={() => setFilterType('announcement')} className={cn("px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all", filterType === 'announcement' ? "bg-white text-sky-600 shadow-sm" : "text-slate-500")}>Thông báo</button>
             <button onClick={() => setFilterType('poll')} className={cn("px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all", filterType === 'poll' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500")}>Khảo sát</button>
           </div>
         </div>
      </div>
      
      {/* DANH SÁCH THẺ (CARDS) */}
      <div className="space-y-6">
        {filteredTasks.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 border-dashed">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm font-medium">Không tìm thấy dữ liệu phù hợp.</p>
          </div>
        ) : (
          Object.entries(groupedTasks).map(([groupName, groupTasks]) => {
            if (groupTasks.length === 0) return null;
            return (
              <div key={groupName} className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{groupName}</h4>
                {groupTasks.map(t => renderTaskCard(t))}
              </div>
            );
          })
        )}
      </div>

      {selectedTaskId && (
        <TaskDetail task={allTasks.find(t => t.id === selectedTaskId)!} onBack={() => setSelectedTaskId(null)} />
      )}
    </div>
  );
};
