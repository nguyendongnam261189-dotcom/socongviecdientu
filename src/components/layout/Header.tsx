import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { School, LogOut, Bell, RotateCcw } from 'lucide-react';

export const Header: React.FC = () => {
  const { currentUser, logout, requestNotificationPermission, showToast } = useAppContext();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  if (!currentUser) return null;

  const hasToken = currentUser && (currentUser as any).fcmTokens && (currentUser as any).fcmTokens.length > 0;
  const showNotificationButton = 'Notification' in window && !hasToken;

  // 🔥 HANDLE REFRESH (PRO - không reload)
  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);

    showToast("🔄 Đang cập nhật dữ liệu...");

    // giả lập loading (Firebase đã realtime rồi)
    await new Promise((res) => setTimeout(res, 800));

    showToast("✅ Đã cập nhật mới nhất");

    setIsRefreshing(false);
  };

  return (
    <header className="bg-indigo-700 px-4 py-3 flex items-center justify-between text-white shadow-md sticky top-0 z-20">
      
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-bold text-xl">
          <School className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight">Trường Học Số</h1>
          <p className="text-[10px] text-indigo-200 uppercase tracking-widest mt-0.5">Mobile First</p>
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-1">
        
        <div className="flex items-center gap-3">
          
          {/* 🔔 BẬT THÔNG BÁO */}
          {showNotificationButton && (
            <button 
              onClick={requestNotificationPermission}
              className="text-[10px] bg-indigo-500 hover:bg-indigo-400 text-white px-2 py-1 rounded-[6px] shadow-sm uppercase tracking-wider font-bold mb-0.5 flex items-center gap-1 transition-colors"
              title="Nhận thông báo đẩy"
            >
              <Bell className="w-3 h-3" />
              Bật thông báo
            </button>
          )}

          {/* 🔄 REFRESH BUTTON (MỚI) */}
          <button
            onClick={handleRefresh}
            className="text-[10px] text-indigo-200 hover:text-white uppercase tracking-wider font-bold mb-0.5 flex items-center gap-1 transition"
            title="Làm mới dữ liệu"
          >
            <RotateCcw 
              className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} 
            />
            Làm mới
          </button>

          {/* 🚪 ĐĂNG XUẤT */}
          <button 
            onClick={logout}
            className="text-[10px] text-indigo-200 hover:text-white uppercase tracking-wider font-bold mb-0.5 flex items-center gap-1"
          >
            Đăng xuất <LogOut className="w-3 h-3" />
          </button>

        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{currentUser.name.split(' ').pop()}</span>
          <div className="w-8 h-8 bg-indigo-500 rounded-full border border-white/30 flex items-center justify-center font-bold text-xs shadow-inner">
            {currentUser.name.split(' ').pop()?.[0]}
          </div>
        </div>

      </div>
    </header>
  );
};
