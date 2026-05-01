import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { TasksView } from './components/views/TasksView';
import { NotificationsView } from './components/views/NotificationsView';
import { DocumentsView } from './components/views/DocumentsView';
import { LoginView } from './components/views/LoginView';
import { DashboardView } from './components/views/DashboardView';
import { UsersView } from './components/views/UsersView';

import { SettingsView } from './components/views/SettingsView';

import { RotateCcw } from 'lucide-react';

const AppContent = () => {
  const { activeTab, currentUser, toast, hideToast, authReady, logout } = useAppContext();

  if (!authReady) {
    return (
      <div className="flex items-center justify-center h-[100dvh] w-full bg-slate-50 text-slate-400 font-medium">
        Đang tải...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col h-[100dvh] w-full bg-slate-50 font-sans text-slate-800 shadow-2xl overflow-hidden relative pointer-events-auto">
        <LoginView />
      </div>
    );
  }

  if (currentUser.status !== 'approved') {
    return (
      <div className="flex flex-col h-[100dvh] w-full bg-slate-50 font-sans text-slate-800 items-center justify-center p-6 relative pointer-events-auto">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full border border-slate-100">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Tài khoản đang chờ duyệt</h2>
          <p className="text-slate-500 text-sm mb-6">
            Tài khoản của bạn đang được quản trị viên xem xét. Vui lòng quay lại sau.
          </p>
          <button 
            onClick={logout}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-slate-50 font-sans text-slate-800 overflow-hidden relative pointer-events-auto">
      <div className="md:hidden">
        <Header />
      </div>
      
      <Sidebar />
      
      <main className="flex-1 overflow-hidden relative flex flex-col md:max-w-6xl md:mx-auto md:w-full md:border-x md:border-slate-200 md:bg-white md:shadow-xl scroll-smooth">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'users' && <UsersView />}
        {activeTab === 'tasks' && <TasksView />}
        {activeTab === 'notifications' && <NotificationsView />}
        {activeTab === 'documents' && <DocumentsView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Global Toast / Undo Snackbar */}
      {toast && (
        <div className="absolute bottom-20 md:bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-sm z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-slate-800 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between border border-slate-700">
            <span className="text-sm font-medium">{toast.message}</span>
            {toast.onUndo && (
              <button 
                onClick={() => {
                  toast.onUndo?.();
                  hideToast();
                }}
                className="flex items-center gap-1.5 text-indigo-300 hover:text-white font-bold text-xs uppercase tracking-wider bg-white/10 px-3 py-1.5 rounded-xl transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Hoàn tác
              </button>
            )}
          </div>
        </div>
      )}

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-slate-900 md:bg-slate-100 flex items-center justify-center">
        <AppContent />
      </div>
    </AppProvider>
  );
}
