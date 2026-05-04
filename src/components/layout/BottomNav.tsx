import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { CheckSquare, FileText, LayoutDashboard, Users, Settings, BarChart3, Inbox } from 'lucide-react';
import { cn, isTaskVisible } from '../../utils';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, tasks, currentUser, users } = useAppContext();

  if (!currentUser) return null;

  // TÍNH TỔNG SỐ LƯỢNG MỤC CẦN XỬ LÝ (GỘP CẢ 3 LOẠI)
  const pendingInboxCount = tasks.filter(t => {
    if (!isTaskVisible(t, currentUser, users)) return false;

    // Không đếm những việc do chính mình tạo (trừ khi tự giao cho mình)
    if (t.createdBy === currentUser.id && (!t.assignedTo || !t.assignedTo.includes(currentUser.id))) return false;

    if (t.category === 'announcement') {
      return !t.readBy?.includes(currentUser.id);
    } 
    if (t.category === 'poll') {
      return !t.pollOptions?.some(opt => opt.votes?.includes(currentUser.id));
    } 
    if (t.category === 'task') {
       if (!t.assignedTo?.includes(currentUser.id)) return false;
       if (t.status === 'done') return false; // Task đã chốt sổ
       
       const isReport = !!t.reportTemplate && t.reportTemplate.length > 0;
       const mySubmission = t.submissions?.find(r => r.userId === currentUser.id);
       
       const isDone = mySubmission?.status === 'done' || (isReport && !!mySubmission);
       return !isDone;
    }
    return false;
  }).length;

  const isAdminOrLeader = currentUser.role === 'admin' || currentUser.role === 'leader';
  const isAdminOrBGH = currentUser.role === 'admin' || currentUser.department === 'BGH';

  return (
    <div className="bg-white border-t border-slate-200 pb-safe z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto no-scrollbar">
      <div className="flex items-center justify-start min-w-max md:justify-around h-16 px-2">
        
        {/* Nút Quản lý & Thống kê dành cho BGH/Tổ trưởng */}
        {isAdminOrLeader && (
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Quản lý & Giao việc"
          />
        )}
        {isAdminOrLeader && (
          <NavItem 
            active={activeTab === 'statistics'} 
            onClick={() => setActiveTab('statistics')}
            icon={<BarChart3 className="w-5 h-5" />}
            label="Thống kê"
          />
        )}

        {/* SIÊU TAB INBOX DÀNH CHO TẤT CẢ MỌI NGƯỜI */}
        <NavItem 
          active={activeTab === 'tasks'} 
          onClick={() => setActiveTab('tasks')}
          icon={<Inbox className="w-5 h-5" />} // Đổi Icon sang Hộp thư cho hợp với ý nghĩa mới
          label="Hộp thư"
          badge={pendingInboxCount}
        />

        <NavItem 
          active={activeTab === 'documents'} 
          onClick={() => setActiveTab('documents')}
          icon={<FileText className="w-5 h-5" />}
          label="Tài liệu"
        />

        {isAdminOrBGH && (
          <NavItem 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')}
            icon={<Users className="w-5 h-5" />}
            label="Thành viên"
          />
        )}

        {currentUser.role === 'admin' && (
          <NavItem 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
            icon={<Settings className="w-5 h-5" />}
            label="Cài đặt"
          />
        )}
      </div>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center w-[80px] shrink-0 h-full space-y-1 relative transition-colors",
      active ? "text-indigo-600" : "text-slate-400 hover:text-indigo-400"
    )}
  >
    <div className="relative">
      <div className={cn("p-1.5 rounded-xl transition-colors", active ? "bg-indigo-50" : "bg-transparent")}>
        {icon}
      </div>
      {badge ? (
        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center border-2 border-white shadow-sm">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </div>
    <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
  </button>
);
