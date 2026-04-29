import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { CheckSquare, Bell, FileText, LayoutDashboard, Users, Settings, CalendarDays } from 'lucide-react';
import { cn, isTaskVisible } from '../../utils';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, tasks, currentUser, users } = useAppContext();

  if (!currentUser) return null;

  const unreadNotifs = tasks.filter(t => 
    (t.category === 'announcement' || t.category === 'poll') && 
    isTaskVisible(t, currentUser, users) &&
    !(t.readBy?.includes(currentUser.id))
  ).length;
  
  const todoTasks = tasks.filter(t => 
    t.category === 'task' &&
    isTaskVisible(t, currentUser, users) &&
    t.assignedTo.includes(currentUser.id) && 
    t.status !== 'done' && 
    !t.submissions?.find(r => r.userId === currentUser.id)
  ).length;

  const isAdminOrLeader = currentUser.role === 'admin' || currentUser.role === 'leader';

  return (
    <div className="bg-white border-t border-slate-200 pb-safe z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto no-scrollbar">
      <div className="flex items-center justify-start min-w-max md:justify-around h-16 px-2">
        <NavItem 
          active={activeTab === 'users'} 
          onClick={() => setActiveTab('users')}
          icon={<Users className="w-5 h-5" />}
          label="Thành viên"
        />
        {isAdminOrLeader && (
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Quản lý"
          />
        )}
        <NavItem 
          active={activeTab === 'tasks'} 
          onClick={() => setActiveTab('tasks')}
          icon={<CheckSquare className="w-5 h-5" />}
          label="Việc làm"
          badge={todoTasks}
        />
        <NavItem 
          active={activeTab === 'timeline'} 
          onClick={() => setActiveTab('timeline')}
          icon={<CalendarDays className="w-5 h-5" />}
          label="Tiến độ"
        />
        <NavItem 
          active={activeTab === 'notifications'} 
          onClick={() => setActiveTab('notifications')}
          icon={<Bell className="w-5 h-5" />}
          label="Thông báo"
          badge={unreadNotifs}
        />
        <NavItem 
          active={activeTab === 'documents'} 
          onClick={() => setActiveTab('documents')}
          icon={<FileText className="w-5 h-5" />}
          label="Tài liệu"
        />
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
