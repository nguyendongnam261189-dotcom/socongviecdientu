import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { School, LogOut } from 'lucide-react';

export const Header: React.FC = () => {
  const { currentUser, logout } = useAppContext();

  if (!currentUser) return null;

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
        <button 
          onClick={logout}
          className="text-[10px] text-indigo-200 hover:text-white uppercase tracking-wider font-bold mb-0.5 flex items-center gap-1"
        >
          Đăng xuất <LogOut className="w-3 h-3" />
        </button>
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
