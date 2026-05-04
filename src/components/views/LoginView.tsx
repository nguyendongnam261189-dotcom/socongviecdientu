import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { School, LogIn } from 'lucide-react';
import { cn } from '../../utils';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

export const LoginView: React.FC = () => {
  const { setCurrentUser, users, addUser } = useAppContext();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      
      // ĐÃ THÊM: Ép Google luôn luôn hiện bảng chọn tài khoản, khắc phục lỗi tự đăng nhập tài khoản cũ
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);
      
      const userEmail = result.user.email;
      if (!userEmail) {
        alert('Tài khoản Google của bạn không có email.');
        return;
      }
      
      // Directly check Firestore to avoid race conditions with AppContext users loading
      const q = query(collection(db, "users"), where("email", "==", userEmail));
      const querySnapshot = await getDocs(q);
      
      let existingUserFromDb = null;
      if (!querySnapshot.empty) {
        existingUserFromDb = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as any;
        
        // Fix for mismatched IDs (from earlier bug where users had random IDs instead of auth UIDs)
        if (existingUserFromDb.id !== result.user.uid) {
          const correctId = result.user.uid;
          const correctedUser = { ...existingUserFromDb, id: correctId };
          
          try {
            await addUser(correctedUser);
            existingUserFromDb = correctedUser;
            // Best effort delete the old one, might fail due to rules but that's ok
            await deleteDoc(doc(db, "users", querySnapshot.docs[0].id)).catch(() => {});
          } catch(e) {
            console.error("Failed to migrate user to proper ID", e);
          }
        }
      }

      if (existingUserFromDb) {
        if (existingUserFromDb.status === 'pending') {
          alert('Tài khoản của bạn đang chờ Admin duyệt. Vui lòng quay lại sau.');
          auth.signOut();
        } else if (existingUserFromDb.status === 'rejected') {
          alert('Tài khoản của bạn đã bị từ chối.');
          auth.signOut();
        } else {
          setCurrentUser(existingUserFromDb);
        }
      } else {
        // We need to check if ANY user exists to determine if we make this one admin
        const allUsersQuery = query(collection(db, "users"));
        const allUsersSnapshot = await getDocs(allUsersQuery);
        const isFirstUser = allUsersSnapshot.empty;
        
        const createdUser = await addUser({
          id: result.user.uid,
          email: userEmail,
          name: result.user.displayName || userEmail.split('@')[0],
          role: isFirstUser ? 'admin' : 'teacher',
          department: isFirstUser ? 'BGH' : 'Khác',
          grade: '',
          status: isFirstUser ? 'approved' : 'pending',
          avatar: result.user.photoURL || undefined
        });

        if (isFirstUser) {
          setCurrentUser(createdUser);
          alert('Khởi tạo tài khoản quản trị thành công.');
        } else {
          alert('Tài khoản của bạn đã được ghi nhận và đang chờ Admin duyệt.');
          auth.signOut();
        }
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/popup-closed-by-user') {
        alert('Bạn đã hủy quá trình đăng nhập.');
      } else {
        alert('Đăng nhập thất bại: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 items-center justify-center p-6 pb-20 relative">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-indigo-600 p-8 flex flex-col items-center text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-400/40 via-transparent to-transparent"></div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center font-bold text-3xl mb-4 backdrop-blur-sm relative z-10 border border-white/30 shadow-inner">
            <School className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold leading-tight relative z-10">Trường Học Số</h1>
          <p className="text-indigo-200 mt-2 text-sm uppercase tracking-widest font-medium relative z-10">Hệ thống giáo viên</p>
        </div>
        
        <div className="p-6 pt-8 space-y-6">
          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            {loading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP BẰNG GOOGLE'}
          </button>
          
          <p className="text-center text-[10px] text-slate-400 font-medium">
            Sử dụng tài khoản email cá nhân hay sử dụng
          </p>
        </div>
      </div>
    </div>
  );
};
