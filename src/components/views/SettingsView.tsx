import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Settings, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { cn } from '../../utils';
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';

const ManageList = ({ title, items, setItems, onAddItem, onUpdateItem, onDeleteItem }: { 
  title: string, 
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
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
      <h3 className="font-bold text-slate-800 mb-4">{title}</h3>
      
      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          placeholder="Thêm mới..."
          className="flex-1 bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-400"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button 
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="bg-indigo-100 text-indigo-700 px-3 rounded-xl disabled:opacity-50 hover:bg-indigo-200"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <div key={item} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
            {editingItem === item ? (
              <div className="flex flex-1 gap-2 items-center">
                <input 
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 text-sm rounded-lg px-2 py-1 outline-none"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveEdit(item);
                    if (e.key === 'Escape') setEditingItem(null);
                  }}
                />
                <button onClick={() => handleSaveEdit(item)} className="text-emerald-600 p-1 bg-emerald-50 rounded-lg"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingItem(null)} className="text-slate-400 p-1 bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <>
                <span className="text-sm font-medium text-slate-700 ml-2">{item}</span>
                <div className="flex gap-1">
                  <button 
                    onClick={() => { setEditingItem(item); setEditValue(item); }}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm(`Xóa "${item}"? Các thành viên đang thuộc mục này sẽ bị đổi thành "Khác".`)) {
                        onDeleteItem(item);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const SettingsView: React.FC = () => {
  const { currentUser, departments, setDepartments, grades, setGrades, users, setUsers, documentCategories, setDocumentCategories, documents, setDocuments, gasUrl, setGasUrl, updateUser, activeWeeksView, setActiveWeeksView } = useAppContext();

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8 text-center text-slate-500">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

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
    
    // Note: documents update should actually update via Firestore if possible
    // Only keeping local for now, but ideal is a Firestore batch edit if we had a function for it
  };

  const handleDeleteDocCat = async (name: string) => {
    const newVal = documentCategories.filter(c => c !== name);
    setDocumentCategories(newVal);
    await setDoc(doc(db, "settings", "system"), { documentCategories: newVal }, { merge: true });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 bg-white shadow-sm z-10 sticky top-0">
        <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500" /> Cài đặt hệ thống
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Giới hạn thời gian hiển thị công việc</h2>
            <p className="text-xs text-slate-500 mt-1">Chọn số tuần dữ liệu gần nhất được tải về để tối ưu chi phí dữ liệu (Các task chưa hoàn thành luôn được tải).</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 4, 8].map(weeks => (
                <button
                  key={weeks}
                  onClick={() => setActiveWeeksView(weeks)}
                  className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${activeWeeksView === weeks ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {weeks} tuần
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Cấu hình Google Apps Script (Tải lên Drive)</h2>
            <p className="text-xs text-slate-500 mt-1">Sử dụng Google Apps Script Web App để tiếp nhận tải lên file và lưu vào Google Drive (chống tốn kém).</p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Web App URL</label>
              <input 
                type="url"
                value={gasUrl}
                onChange={e => setGasUrl(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all font-medium text-slate-700"
                placeholder="https://script.google.com/macros/s/.../exec"
              />
            </div>
            <div className="bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-100 text-sm">
              <p className="font-bold mb-1">Hướng dẫn cài đặt:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs opacity-90">
                <li>Truy cập <a href="https://script.google.com" target="_blank" className="font-bold underline" rel="nofollow noreferrer">script.google.com</a> tạo dự án mới.</li>
                <li>Sử dụng doPost để xử lý tải lên nội dung Base64 và lưu File vào Drive.</li>
                <li>Triển khai dưới dạng <b>Web App</b> (Execute as: Me, Who has access: Anyone)</li>
                <li>Copy URL dán vào ô bên trên.</li>
              </ol>
            </div>
          </div>
        </div>

        <ManageList 
          title="Quản lý Nhóm tài liệu"
          items={documentCategories}
          setItems={setDocumentCategories}
          onAddItem={handleAddDocCat}
          onUpdateItem={handleUpdateDocCat}
          onDeleteItem={handleDeleteDocCat}
        />

        <ManageList 
          title="Quản lý Tổ chuyên môn"
          items={departments}
          setItems={setDepartments}
          onAddItem={handleAddDept}
          onUpdateItem={handleUpdateDept}
          onDeleteItem={handleDeleteDept}
        />

        <ManageList 
          title="Quản lý Nhóm / Khối"
          items={grades}
          setItems={setGrades}
          onAddItem={handleAddGrade}
          onUpdateItem={handleUpdateGrade}
          onDeleteItem={handleDeleteGrade}
        />
      </div>
    </div>
  );
};
