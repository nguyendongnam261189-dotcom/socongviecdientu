import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Settings, Plus, Trash2, Edit2, Check, X, UserCircle, Phone, Mail, Save, Database, Server, BookOpen, Layers, Tags } from 'lucide-react';
import { cn } from '../../utils';
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';

const ManageList = ({ title, icon: Icon, items, setItems, onAddItem, onUpdateItem, onDeleteItem }: { 
  title: string, 
  icon: React.ElementType,
  items: string[], 
  setItems: React.Dispatch<React.SetStateAction<string[]>>,
  onAddItem: (name: string) => void,
  onUpdateItem: (oldName: string, newName: string) => void,
  onDeleteItem: (name: string) => void
}) => {
  const [newItem, setNewItem] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAdd = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      onAddItem(newItem.trim());
      setNewItem('');
    }
  };

  const handleSaveEdit = (oldName: string) => {
    if (editValue.trim() && editValue !== oldName && !items.includes(editValue.trim())) {
      onUpdateItem(oldName, editValue.trim());
    } else if (editValue.trim() === oldName) {
      setEditingItem(null);
    }
    setEditingItem(null);
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
           <Icon className="w-4 h-4" />
        </div>
        {title}
      </h3>
      
      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          placeholder="Nhập tên mới..."
          className="flex-1 bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button 
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="bg-indigo-600 text-white px-4 rounded-xl disabled:opacity-50 disabled:bg-slate-300 hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 no-scrollbar">
        {items.map(item => (
          <div key={item} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors group">
            {editingItem === item ? (
              <div className="flex flex-1 gap-2 items-center">
                <input 
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="flex-1 bg-white border border-indigo-300 text-sm font-bold text-indigo-900 rounded-lg px-3 py-1.5 outline-none shadow-inner"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveEdit(item);
                    if (e.key === 'Escape') setEditingItem(null);
                  }}
                />
                <button onClick={() => handleSaveEdit(item)} className="text-emerald-600 p-1.5 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingItem(null)} className="text-slate-500 p-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <>
                <span className="text-sm font-bold text-slate-700 ml-2">{item}</span>
                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { setEditingItem(item); setEditValue(item); }}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm(`Xóa "${item}"? Các thành viên đang thuộc mục này sẽ bị đổi thành "Khác".`)) {
                        onDeleteItem(item);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {items.length === 0 && (
           <div className="text-center py-4 text-xs font-medium text-slate-400 italic">Chưa có dữ liệu nào.</div>
        )}
      </div>
    </div>
  );
};

export const SettingsView: React.FC = () => {
  const { currentUser, departments, setDepartments, grades, setGrades, users, setUsers, documentCategories, setDocumentCategories, gasUrl, setGasUrl, updateUser, activeWeeksView, setActiveWeeksView, showToast } = useAppContext();

  // State cho phần cập nhật thông tin cá nhân
  const [personalName, setPersonalName] = useState(currentUser?.name || '');
  const [personalPhone, setPersonalPhone] = useState(currentUser?.phone || '');

  if (!currentUser) return null;

  const handleUpdateProfile = () => {
    if (!personalName.trim()) {
       showToast("Tên không được để trống!");
       return;
    }
    updateUser(currentUser.id, { name: personalName.trim(), phone: personalPhone.trim() });
    showToast("Đã cập nhật thông tin cá nhân thành công!");
  };

  const handleAddDept = async (newName: string) => {
    const newVal = [...departments, newName];
    setDepartments(newVal);
    try {
      await setDoc(doc(db, "settings", "system"), { departments: newVal }, { merge: true });
    } catch (e) {
      console.error(e);
      alert("Lỗi thêm DB: " + (e as Error).message);
    }
  };

  const handleUpdateDept = async (oldName: string, newName: string) => {
    const newVal = departments.map(d => d === oldName ? newName : d);
    setDepartments(newVal);
    try {
      await setDoc(doc(db, "settings", "system"), { departments: newVal }, { merge: true });
    } catch (e) {
      console.error(e);
      alert("Lỗi lưu DB: " + (e as Error).message);
    }
    
    users.filter(u => u.department === oldName).forEach(u => {
      updateUser(u.id, { department: newName });
    });
  };

  const handleDeleteDept = async (name: string) => {
    const newVal = departments.filter(d => d !== name);
    setDepartments(newVal);
    await setDoc(doc(db, "settings", "system"), { departments: newVal }, { merge: true });
    
    users.filter(u => u.department === name).forEach(u => {
      updateUser(u.id, { department: 'Khác' });
    });
  };

  const handleAddGrade = async (newName: string) => {
    const newVal = [...grades, newName];
    setGrades(newVal);
    await setDoc(doc(db, "settings", "system"), { grades: newVal }, { merge: true });
  };

  const handleUpdateGrade = async (oldName: string, newName: string) => {
    const newVal = grades.map(g => g === oldName ? newName : g);
    setGrades(newVal);
    await setDoc(doc(db, "settings", "system"), { grades: newVal }, { merge: true });
    
    users.filter(u => u.grade === oldName).forEach(u => {
      updateUser(u.id, { grade: newName });
    });
  };

  const handleDeleteGrade = async (name: string) => {
    const newVal = grades.filter(g => g !== name);
    setGrades(newVal);
    await setDoc(doc(db, "settings", "system"), { grades: newVal }, { merge: true });
    
    users.filter(u => u.grade === name).forEach(u => {
      updateUser(u.id, { grade: 'Khác' });
    });
  };

  const handleAddDocCat = async (newName: string) => {
    const newVal = [...documentCategories, newName];
    setDocumentCategories(newVal);
    await setDoc(doc(db, "settings", "system"), { documentCategories: newVal }, { merge: true });
  };

  const handleUpdateDocCat = async (oldName: string, newName: string) => {
    const newVal = documentCategories.map(c => c === oldName ? newName : c);
    setDocumentCategories(newVal);
    await setDoc(doc(db, "settings", "system"), { documentCategories: newVal }, { merge: true });
  };

  const handleDeleteDocCat = async (name: string) => {
    const newVal = documentCategories.filter(c => c !== name);
    setDocumentCategories(newVal);
    await setDoc(doc(db, "settings", "system"), { documentCategories: newVal }, { merge: true });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 bg-white shadow-sm z-10 sticky top-0 border-b border-slate-200">
        <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600" /> Cài đặt & Hồ sơ
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
        
        {/* KHU VỰC 1: HỒ SƠ CÁ NHÂN (AI CŨNG THẤY) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-indigo-50/30 flex items-center gap-2">
             <UserCircle className="w-5 h-5 text-indigo-600" />
             <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Hồ sơ cá nhân</h2>
          </div>
          <div className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Họ và tên</label>
                <input 
                  type="text" 
                  value={personalName}
                  onChange={e => setPersonalName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Số điện thoại</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="tel" 
                    value={personalPhone}
                    onChange={e => setPersonalPhone(e.target.value)}
                    placeholder="Chưa cập nhật..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Email đăng nhập (Không thể sửa)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="email" 
                    value={currentUser.email}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 text-sm rounded-xl cursor-not-allowed font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Thông tin Công tác</label>
                <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 flex items-center justify-between">
                  <span>Tổ: <span className="font-bold text-slate-800">{typeof currentUser.department === 'string' ? currentUser.department : 'Khác'}</span></span>
                  <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold uppercase">{currentUser.role}</span>
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <button 
                onClick={handleUpdateProfile}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-indigo-600/20 active:scale-95"
              >
                <Save className="w-4 h-4" /> Lưu thông tin cá nhân
              </button>
            </div>
          </div>
        </div>

        {/* KHU VỰC 2: CÀI ĐẶT HỆ THỐNG (CHỈ ADMIN THẤY) */}
        {currentUser.role === 'admin' && (
          <>
            <div className="flex items-center gap-2 mt-8 mb-4 px-1">
               <Database className="w-5 h-5 text-rose-500" />
               <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Khu vực cấu hình hệ thống (Dành cho Admin)</h2>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
              <div className="p-4 border-b border-rose-50 bg-rose-50/30">
                <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Server className="w-4 h-4 text-rose-500"/> Giới hạn bộ nhớ đệm (Tối ưu tốc độ)</h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Để App chạy mượt mà, hãy chọn số tuần dữ liệu quá khứ được phép tải về thiết bị. <br/>(Lưu ý: Các công việc chưa hoàn thành sẽ luôn được hiển thị bất chấp giới hạn này).</p>
              </div>
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1, 2, 4, 8].map(weeks => (
                    <button
                      key={weeks}
                      onClick={() => setActiveWeeksView(weeks)}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${activeWeeksView === weeks ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm ring-1 ring-rose-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {weeks} tuần
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Cấu hình API Google Drive (Tải file)</h2>
                <p className="text-xs text-slate-500 mt-1">Dán liên kết Web App (Google Apps Script) để kích hoạt tính năng lưu trữ file 0 đồng.</p>
              </div>
              <div className="p-4 sm:p-5 space-y-4">
                <div>
                  <input 
                    type="url"
                    value={gasUrl}
                    onChange={e => setGasUrl(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-800 shadow-inner"
                    placeholder="https://script.google.com/macros/s/.../exec"
                  />
                </div>
                <div className="bg-sky-50 text-sky-800 p-4 rounded-xl border border-sky-100 text-sm">
                  <p className="font-bold mb-2">Hướng dẫn triển khai nhanh:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs opacity-90 font-medium">
                    <li>Vào <a href="https://script.google.com" target="_blank" className="font-bold underline text-indigo-600 hover:text-indigo-800" rel="nofollow noreferrer">script.google.com</a> tạo dự án.</li>
                    <li>Code hàm <code className="bg-white/50 px-1 py-0.5 rounded text-sky-900">doPost(e)</code> để nhận file Base64 và tạo file mới trên Drive.</li>
                    <li>Bấm Deploy {'>'} New Deployment {'>'} <b>Web App</b>.</li>
                    <li>Access: <b>Anyone</b> {'>'} Deploy {'>'} Copy URL vào ô trên.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ManageList 
                title="Tổ chuyên môn"
                icon={BookOpen}
                items={departments}
                setItems={setDepartments}
                onAddItem={handleAddDept}
                onUpdateItem={handleUpdateDept}
                onDeleteItem={handleDeleteDept}
              />
              
              <ManageList 
                title="Khối / Nhóm kiêm nhiệm"
                icon={Layers}
                items={grades}
                setItems={setGrades}
                onAddItem={handleAddGrade}
                onUpdateItem={handleUpdateGrade}
                onDeleteItem={handleDeleteGrade}
              />
            </div>

            <div className="md:w-1/2">
              <ManageList 
                title="Danh mục Kho Tài liệu"
                icon={Tags}
                items={documentCategories}
                setItems={setDocumentCategories}
                onAddItem={handleAddDocCat}
                onUpdateItem={handleUpdateDocCat}
                onDeleteItem={handleDeleteDocCat}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
