import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { FileText, LayoutDashboard, Users, School, LogOut, Settings, BarChart3, Inbox } from 'lucide-react';
import { cn, isTaskVisible } from '../../utils';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, tasks, currentUser, users, logout } = useAppContext();

  if (!currentUser) return null;

  // TÍNH TỔNG SỐ LƯỢNG MỤC CẦN XỬ LÝ (GỘP CẢ 3 LOẠI VÀO INBOX)
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
    <div className="w-64 bg-slate-900 text-slate-300 flex-col py-6 px-4 hidden md:flex h-full shadow-2xl relative z-30 flex-shrink-0">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/20">
          <School className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-base text-white leading-tight">Trường Học Số</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Quản Trị</p>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {isAdminOrBGH && (
          <NavItem 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')}
            icon={<Users className="w-5 h-5" />}
            label="Thành viên"
          />
        )}
        {isAdminOrLeader && (
          <>
            <NavItem 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')}
              icon={<LayoutDashboard className="w-5 h-5" />}
              label="Quản lý & Giao việc"
            />
            <NavItem 
              active={activeTab === 'statistics'} 
              onClick={() => setActiveTab('statistics')}
              icon={<BarChart3 className="w-5 h-5" />}
              label="Thống kê"
            />
            <div className="my-4 border-t border-slate-800" />
          </>
        )}

        {/* NÚT INBOX GỘP CHUNG */}
        <NavItem 
          active={activeTab === 'tasks'} 
          onClick={() => setActiveTab('tasks')}
          icon={<Inbox className="w-5 h-5" />}
          label="Hộp thư / Việc của tôi"
          badge={pendingInboxCount}
        />
        
        <NavItem 
          active={activeTab === 'documents'} 
          onClick={() => setActiveTab('documents')}
          icon={<FileText className="w-5 h-5" />}
          label="Tài liệu"
        />

        {/* NÚT CÀI ĐẶT & HỒ SƠ ĐÃ ĐƯỢC GIẢI CỨU ĐỂ AI CŨNG THẤY */}
        <NavItem 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')}
          icon={<Settings className="w-5 h-5" />}
          label="Cài đặt & Hồ sơ"
        />
      </div>

      <div className="mt-auto border-t border-slate-800 pt-4 px-2">
        <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl">
          <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-white shadow-inner">
            {currentUser.name.split(' ').pop()?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-white truncate">{currentUser.name}</div>
            <div className="text-[10px] text-slate-400 capitalize">{currentUser.role}</div>
          </div>
          <button 
            onClick={logout}
            className="p-2 hover:bg-slate-700 hover:text-white rounded-lg transition-colors text-slate-400"
            title="Đăng xuất"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-medium",
      active ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
    )}
  >
    {icon}
    <span className="flex-1 text-left">{label}</span>
    {badge ? (
      <span className={cn(
        "text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center",
        active ? "bg-white text-indigo-700" : "bg-rose-500 text-white shadow-sm"
      )}>
        {badge > 99 ? '99+' : badge}
      </span>
    ) : null}
  </button>
);
