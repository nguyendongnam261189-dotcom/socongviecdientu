import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Bell, Check, MessageCircle, BarChart2, Trash2, Search, Lock, Unlock, Paperclip, FileText, Download, X } from 'lucide-react';
import { Task } from '../../types';
import { cn, isTaskVisible, canEditTask, canDeleteTask } from '../../utils';
import { format, parseISO } from 'date-fns';

// COMPONENT XEM TRƯỚC VÀ TẢI FILE - ĐÃ CẢI TIẾN CHỐNG ĐƠ
const FilePreview: React.FC<{ title: string, url: string }> = ({ title, url }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(title) || url.startsWith('data:image/');
  
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const fileId = driveMatch ? driveMatch[1] : null;
  const embedUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
  
  // Link tải trực tiếp từ Google Drive
  const downloadUrl = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : url;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(downloadUrl, '_blank');
  };

  return (
    <>
      <div className="flex gap-2 mt-2 w-full">
        <button 
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

        {/* NÚT TẢI VỀ NHANH (KHÔNG CẦN MỞ PREVIEW) */}
        <button 
          onClick={handleDownload}
          className="p-3 bg-slate-100 text-slate-600 rounded-xl border border-slate-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm"
          title="Tải về máy"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Modal xem trước - ĐÃ FIX LỖI ĐƠ APP */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
        >
          <div 
            className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden relative pointer-events-auto"
            onClick={(e) => e.stopPropagation()} 
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-100 bg-white shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-800 truncate pr-4 flex-1">{title}</h3>
              <div className="flex gap-2 shrink-0 items-center">
                <button 
                  onClick={handleDownload}
                  className="px-3 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Tải xuống
                </button>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="p-2 text-slate-400 hover:text-rose-500 bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Nội dung Preview */}
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
      showToast('Đã hủy bình chọn', () => { votePoll(notif.id, oldVoteId); });
    } else {
      showToast('Đã ghi nhận bình chọn', () => { votePoll(notif.id, oldVoteId || null); });
    }
  };

  const handleToggleLock = () => {
    if (window.confirm(notif.isLocked ? 'Mở khóa khảo sát này?' : 'Khóa khảo sát này?')) {
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
  const votedUserIds = new Set(notif.pollOptions?.flatMap(opt => opt.votes) || []);
  const unvotedUsers = notif.assignedTo.filter(uid => !votedUserIds.has(uid));

  return (
    <div className={cn("bg-white rounded-2xl shadow-sm border p-4 relative group transition-colors", !isRead ? "border-indigo-200 bg-indigo-50/20" : "border-slate-200")} onClick={() => { if(!isRead) markTaskRead(notif.id); }}>
      {canManage && (
        <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="absolute top-3 right-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors z-10 sm:hidden sm:group-hover:block active:block">
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
          <h3 className="font-bold text-sm text-slate-800 leading-tight">{notif.title}</h3>
          <p className="mt-1.5 text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed">{notif.description}</p>

          {/* TỆP ĐÍNH KÈM CÓ NÚT TẢI XUỐNG */}
          {notif.attachments && notif.attachments.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tài liệu đính kèm ({notif.attachments.length})</h4>
              <div className="space-y-2">
                {notif.attachments.map((att, idx) => (
                  <FilePreview key={idx} title={att.title} url={att.url} />
                ))}
              </div>
            </div>
          )}

          {/* Poll Options */}
          {notif.category === 'poll' && notif.pollOptions && (
            <div className="mt-3 space-y-2 relative z-0" onClick={e => e.stopPropagation()}>
              {notif.pollOptions.map(opt => {
                const voted = opt.votes.includes(currentUser?.id || '');
                const percent = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                return (
                  <button key={opt.id} onClick={() => handleVote(opt.id)} className={cn("w-full text-left p-2.5 rounded-xl border text-[11px] relative overflow-hidden transition-all shadow-sm", voted ? (notif.isLocked ? "border-slate-400 bg-slate-50" : "border-amber-400 bg-amber-50") : "border-slate-200 hover:bg-slate-50")}>
                    <div className={cn("absolute inset-y-0 left-0 transition-all opacity-50", voted ? (notif.isLocked ? "bg-slate-300" : "bg-amber-300") : (notif.isLocked ? "bg-slate-200" : "bg-amber-100"))} style={{ width: `${percent}%` }} />
                    <div className="relative flex justify-between items-center z-10">
                      <span className={cn("font-bold", voted ? (notif.isLocked ? "text-slate-800" : "text-amber-800") : "text-slate-700")}>{opt.text}</span>
                      <span className="text-slate-500 font-medium text-[10px]">{percent}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Read Receipt & Controls */}
          {!isRead && notif.category === 'announcement' && (
            <button onClick={(e) => { e.stopPropagation(); markTaskRead(notif.id); }} className="mt-3 flex items-center gap-1.5 text-xs bg-indigo-100 text-indigo-700 px-3 py-2 rounded-xl font-bold hover:bg-indigo-200 shadow-sm">
              <Check className="w-4 h-4" /> Đã nắm thông tin
            </button>
          )}

          {notif.category === 'announcement' && canManage && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Tiến độ nắm thông tin</span>
                <span className="text-xs font-bold text-indigo-600">{notif.readBy?.length || 0} / {notif.assignedTo.length}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${notif.assignedTo.length ? ((notif.readBy?.length || 0) / notif.assignedTo.length) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          {notif.category === 'poll' && canManage && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <button onClick={(e) => { e.stopPropagation(); handleToggleLock(); }} className={cn("flex items-center gap-1.5 text-[10px] px-2 py-1.5 rounded-lg border font-bold uppercase", notif.isLocked ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-slate-50 text-slate-600")}>
                {notif.isLocked ? <><Unlock className="w-3 h-3" /> Mở khóa</> : <><Lock className="w-3 h-3" /> Khóa khảo sát</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
