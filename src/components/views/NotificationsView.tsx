import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Bell, Check, MessageCircle, BarChart2, Trash2, Search, Lock, Unlock } from 'lucide-react';
import { Task } from '../../types';
import { cn, isTaskVisible, canEditTask, canDeleteTask } from '../../utils';
import { format, parseISO } from 'date-fns';

export const NotificationsView: React.FC = () => {
  const { tasks, currentUser, users } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  
  if (!currentUser) return null;

  let notifications = tasks
    .filter(t => (t.category === 'announcement' || t.category === 'poll') && isTaskVisible(t, currentUser, users))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    notifications = notifications.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 shadow-sm z-10 sticky top-0 border-b border-slate-200">
        <h2 className="font-bold text-lg text-slate-800 flex items-center justify-between">
          Bảng tin & Thông báo
        </h2>
        <div className="relative mt-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Tìm kiếm thông báo, khảo sát..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl pl-9 pr-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all font-medium"
          />
        </div>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="text-center text-slate-500 mt-10">Không có thông báo nào.</div>
        ) : (
          notifications.map(notif => (
            <NotificationCard key={notif.id} notif={notif} isRead={notif.readBy?.includes(currentUser.id) || false} />
          ))
        )}
      </div>
    </div>
  );
};

const NotificationCard: React.FC<{ notif: Task, isRead: boolean }> = ({ notif, isRead }) => {
  const { markTaskRead, votePoll, toggleTaskLock, deleteTask, currentUser, showToast, users } = useAppContext();

  const getIcon = () => {
    if (notif.isLocked) return <Lock className="w-5 h-5 text-slate-400" />;
    switch (notif.category) {
      case 'announcement': return <Bell className="w-5 h-5 text-indigo-600" />;
      case 'poll': return <BarChart2 className="w-5 h-5 text-amber-600" />;
      default: return <MessageCircle className="w-5 h-5 text-emerald-600" />;
    }
  };
  
  const getBadgeFormat = () => {
    if (notif.isLocked) return { label: 'ĐÃ KHÓA', color: 'bg-slate-100 text-slate-600 border border-slate-200' };
    switch (notif.category) {
      case 'announcement': return { label: 'THÔNG BÁO', color: 'bg-indigo-100 text-indigo-700 border border-indigo-200' };
      case 'poll': return { label: 'KHẢO SÁT', color: 'bg-amber-100 text-amber-700 border border-amber-200' };
      default: return { label: 'THẢO LUẬN', color: 'bg-emerald-100 text-emerald-700 border border-emerald-200' };
    }
  };
  const badge = getBadgeFormat();

  const handleVote = (optionId: string) => {
    if (notif.isLocked) {
      showToast('Khảo sát này đã bị khóa');
      return;
    }
    const oldVoteId = notif.pollOptions?.find(opt => opt.votes.includes(currentUser?.id || ''))?.id;
    votePoll(notif.id, optionId);
    
    if (oldVoteId === optionId) {
      // Toggle off
      showToast('Đã hủy bình chọn', () => {
        votePoll(notif.id, oldVoteId); // Revert to voted
      });
    } else {
      showToast('Đã ghi nhận bình chọn', () => {
        votePoll(notif.id, oldVoteId || null); // Revert to previous vote or empty
      });
    }
  };

  const handleToggleLock = () => {
    if (window.confirm(notif.isLocked ? 'Mở khóa khảo sát này?' : 'Khóa khảo sát này? (Người khác sẽ không thể bình chọn nữa)')) {
      toggleTaskLock(notif.id);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Xóa thông báo này?')) {
      deleteTask(notif.id);
    }
  };

  const canManage = canEditTask(notif, currentUser, users);
  const totalVotes = notif.pollOptions?.reduce((acc, opt) => acc + opt.votes.length, 0) || 0;
  
  // Calculate who hasn't voted for polls
  const votedUserIds = new Set(notif.pollOptions?.flatMap(opt => opt.votes) || []);
  const unvotedUsers = notif.assignedTo.filter(uid => !votedUserIds.has(uid));

  return (
    <div className={cn("bg-white rounded-2xl shadow-sm border p-4 relative group cursor-pointer transition-colors", !isRead ? "border-indigo-200 bg-indigo-50/20" : "border-slate-200")} onClick={() => { if(!isRead) markTaskRead(notif.id); }}>
      {canManage && (
        <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="absolute top-3 right-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors z-10 hidden sm:group-hover:block active:block">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      <div className="flex justify-between items-start mb-2">
        <span className={cn("px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider shadow-sm", badge.color)}>
          {badge.label}
        </span>
        <div className="mt-1 text-[10px] font-medium text-slate-400">
           {format(parseISO(notif.createdAt), 'HH:mm - dd/MM')}
        </div>
      </div>
      <div className="flex gap-3 mt-3">
        <div className={cn("mt-1 p-2.5 rounded-xl h-fit border shadow-sm", notif.category === 'poll' ? 'bg-amber-50 border-amber-100' : 'bg-indigo-50 border-indigo-100')}>
          {getIcon()}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm text-slate-800 leading-tight">
            {notif.title}
          </h3>
          <p className="mt-1.5 text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed">
            {notif.description}
          </p>

          {/* Poll Options */}
          {notif.category === 'poll' && notif.pollOptions && (
            <div className="mt-3 space-y-2 relative z-0" onClick={e => e.stopPropagation()}>
              {notif.pollOptions.map(opt => {
                const voted = opt.votes.includes(currentUser?.id || '');
                const percent = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                return (
                  <button 
                    key={opt.id}
                    onClick={() => handleVote(opt.id)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-xl border text-[11px] relative overflow-hidden transition-all shadow-sm",
                      voted 
                        ? (notif.isLocked ? "border-slate-400 bg-slate-50" : "border-amber-400 bg-amber-50") 
                        : "border-slate-200 hover:bg-slate-50",
                      !notif.isLocked && !voted && "hover:border-amber-200",
                      notif.isLocked && "cursor-not-allowed hover:bg-transparent hover:border-slate-200"
                    )}
                  >
                    <div 
                      className={cn(
                        "absolute inset-y-0 left-0 transition-all opacity-50", 
                        voted 
                          ? (notif.isLocked ? "bg-slate-300" : "bg-amber-300") 
                          : (notif.isLocked ? "bg-slate-200" : "bg-amber-100")
                      )} 
                      style={{ width: `${percent}%` }}
                    />
                    <div className="relative flex justify-between items-center z-10">
                      <span className={cn("font-bold flex items-center gap-1", voted ? (notif.isLocked ? "text-slate-800" : "text-amber-800") : "text-slate-700")}>
                        {opt.text}
                      </span>
                      <span className="text-slate-500 font-medium text-[10px]">{percent}%</span>
                    </div>
                  </button>
                );
              })}
              <div className="flex justify-between items-center mt-1.5">
                {notif.isLocked ? (
                  <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md"><Lock className="w-3 h-3" /> Đã đóng bình chọn</span>
                ) : <span />}
                <div className="text-[10px] font-medium text-slate-400 text-right">{totalVotes} lượt bình chọn</div>
              </div>
            </div>
          )}

          {/* Read Receipt Button */}
          {!isRead && notif.category === 'announcement' && (
            <button 
              onClick={(e) => { e.stopPropagation(); markTaskRead(notif.id); }}
              className="mt-3 flex items-center gap-1.5 text-xs bg-indigo-100 text-indigo-700 px-3 py-2 rounded-xl font-bold uppercase tracking-wider hover:bg-indigo-200 transition-all shadow-sm"
            >
              <Check className="w-4 h-4" /> Đã nắm thông tin
            </button>
          )}

          {/* Read Receipt Stats */}
          {notif.category === 'announcement' && canManage && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Tiến độ nắm thông tin</span>
                <span className="text-xs font-bold text-indigo-600">
                  {notif.readBy?.length || 0} / {notif.assignedTo.length}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-1.5 shadow-inner">
                <div 
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${notif.assignedTo.length ? ((notif.readBy?.length || 0) / notif.assignedTo.length) * 100 : 0}%` }}
                />
              </div>
              {notif.assignedTo.length > (notif.readBy?.length || 0) && (
                <div className="text-[10px] text-slate-500 line-clamp-1" title={users.filter(u => notif.assignedTo.includes(u.id) && !notif.readBy?.includes(u.id)).map(u => u.name).join(', ')}>
                  <span className="font-semibold text-slate-600">Chưa xem: </span>
                  {users.filter(u => notif.assignedTo.includes(u.id) && !notif.readBy?.includes(u.id)).map(u => u.name).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Poll Stats and Controls */}
          {notif.category === 'poll' && canManage && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Tiến độ khảo sát</span>
                <span className="text-xs font-bold text-amber-600">
                  {notif.assignedTo.length - unvotedUsers.length} / {notif.assignedTo.length}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-1.5 shadow-inner">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${notif.assignedTo.length ? ((notif.assignedTo.length - unvotedUsers.length) / notif.assignedTo.length) * 100 : 0}%` }}
                />
              </div>
              {unvotedUsers.length > 0 && (
                <div className="text-[10px] text-slate-500 line-clamp-1 mb-2" title={users.filter(u => unvotedUsers.includes(u.id)).map(u => u.name).join(', ')}>
                  <span className="font-semibold text-slate-600">Chưa bình chọn: </span>
                  {users.filter(u => unvotedUsers.includes(u.id)).map(u => u.name).join(', ')}
                </div>
              )}
              
              <button 
                onClick={(e) => { e.stopPropagation(); handleToggleLock(); }}
                className={cn(
                  "flex items-center gap-1.5 text-[10px] px-2 py-1.5 rounded-lg border font-bold uppercase transition-colors",
                  notif.isLocked ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                {notif.isLocked ? <><Unlock className="w-3 h-3" /> Mở khóa khảo sát</> : <><Lock className="w-3 h-3" /> Khóa khảo sát</>}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
