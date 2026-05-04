import React, { useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Users, UserPlus, Shield, Star, BookOpen, ChevronLeft, Edit2, Upload, Download, Search, Filter, Plus, X } from 'lucide-react';
import { cn } from '../../utils';
import { User, Role } from '../../types';
import * as XLSX from 'xlsx';

const RoleOption = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
  <button 
    type="button"
    onClick={onClick}
    className={cn(
      "px-3 py-2 text-sm font-medium rounded-xl border transition-all duration-200 shadow-sm",
      active 
        ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold" 
        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
    )}
  >
    {label}
  </button>
);

const UserForm = ({ initialUser, onBack, onSubmit, onDelete }: { initialUser?: User, onBack: () => void, onSubmit: (user: Partial<User>) => void, onDelete?: () => void }) => {
  const { departments: contextDepartments, grades: contextGrades, users } = useAppContext();
  const [name, setName] = useState(initialUser?.name || '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [phone, setPhone] = useState(initialUser?.phone || '');
  
  // CẤU TRÚC MỚI: Tách biệt Tổ chuyên môn và Nhóm kiêm nhiệm
  const [department, setDepartment] = useState<string>(
    (typeof initialUser?.department === 'string' ? initialUser.department : undefined) || 
    (contextDepartments.length > 0 ? contextDepartments[0] : 'Khác')
  );
  const [userGroups, setUserGroups] = useState<string[]>(initialUser?.groups || []);
  const [newGroup, setNewGroup] = useState('');
  
  const [role, setRole] = useState<Role>(initialUser?.role || 'teacher');
  const [grade, setGrade] = useState<string>(initialUser?.grade || (contextGrades.length > 0 ? contextGrades[0] : ''));

  // Tự động gom các Nhóm kiêm nhiệm hiện có trong toàn hệ thống
  const allSystemGroups = Array.from(new Set(users.flatMap(u => u.groups || []))).filter(Boolean).sort();
  const displayGroups = Array.from(new Set([...allSystemGroups, ...userGroups]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vui lòng nhập tên');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      alert('Vui lòng nhập email hợp lệ');
      return;
    }
    onSubmit({
      name,
      email,
      phone,
      department, // Gửi 1 Tổ cố định
      groups: userGroups, // Gửi mảng Nhóm linh hoạt
      role,
      grade
    });
  };

  return (
    <div className="absolute inset-0 bg-slate-50 z-30 flex flex-col animate-in slide-in-from-right-8 duration-200 pointer-events-auto">
      <div className="bg-white px-4 h-14 flex items-center gap-3 border-b border-slate-200 flex-shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="font-semibold text-lg truncate flex-1 leading-tight text-slate-800">
          {initialUser ? 'Cập nhật thành viên' : 'Thêm thành viên'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:flex md:justify-center">
        <form id="add-user-form" onSubmit={handleSubmit} className="space-y-4 md:w-full md:max-w-xl">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Họ và tên</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên giáo viên..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium shadow-inner"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Email (Dùng để đăng nhập)</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@truong.edu.vn"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium shadow-inner"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Số điện thoại</label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium shadow-inner"
              />
            </div>

            {/* TỔ CHUYÊN MÔN: CHỌN 1 */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Tổ chuyên môn (Chính)</label>
              <select 
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium shadow-inner"
              >
                {contextDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
                {!contextDepartments.includes(department) && department !== '' && (
                  <option value={department}>{department} (Khác)</option>
                )}
              </select>
            </div>

            {/* NHÓM KIÊM NHIỆM: CHỌN NHIỀU */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Nhóm kiêm nhiệm / Chức vụ khác</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {displayGroups.map(grp => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setUserGroups(prev => prev.includes(grp) ? prev.filter(g => g !== grp) : [...prev, grp])}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                      userGroups.includes(grp) 
                        ? "bg-indigo-100 border-indigo-200 text-indigo-700 shadow-sm" 
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                    )}
                  >
                    {grp}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroup}
                  onChange={e => setNewGroup(e.target.value)}
                  placeholder="Thêm nhóm mới..."
                  className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newGroup.trim() && !userGroups.includes(newGroup.trim())) {
                        setUserGroups([...userGroups, newGroup.trim()]);
                        setNewGroup('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newGroup.trim() && !userGroups.includes(newGroup.trim())) {
                      setUserGroups([...userGroups, newGroup.trim()]);
                      setNewGroup('');
                    }
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Vai trò hệ thống</label>
              <div className="grid grid-cols-3 gap-2">
                <RoleOption active={role === 'teacher'} onClick={() => setRole('teacher')} label="Giáo viên" />
                <RoleOption active={role === 'leader'} onClick={() => setRole('leader')} label="Tổ trưởng" />
                <RoleOption active={role === 'admin'} onClick={() => setRole('admin')} label="Admin (BGH)" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Khối giảng dạy / Chủ nhiệm</label>
              <select 
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium shadow-inner"
              >
                {contextGrades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
                {!contextGrades.includes(grade) && grade !== '' && (
                  <option value={grade}>{grade} (Khác)</option>
                )}
              </select>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white p-3 border-t border-slate-200 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] md:flex md:justify-center md:gap-3 z-10">
        <button 
          form="add-user-form"
          type="submit"
          className="w-full md:max-w-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 text-sm mb-2 md:mb-0"
        >
          {initialUser ? 'LƯU THAY ĐỔI' : 'LƯU THÀNH VIÊN'}
        </button>
        {initialUser && onDelete && (
           <button 
             type="button"
             onClick={() => {
               if(window.confirm('Bạn có chắc chắn muốn xóa thành viên này?')) {
                 onDelete();
               }
             }}
             className="w-full md:max-w-[120px] bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold py-3.5 rounded-xl transition-all shadow-sm text-sm"
           >
             XÓA
           </button>
        )}
      </div>
    </div>
  );
};

export const UsersView: React.FC = () => {
  const { users, currentUser, addUser, updateUser, deleteUser, departments, grades } = useAppContext();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
        
        let addedCount = 0;
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 1 || !row[0]) continue;
          
          const name = String(row[0]).trim();
          const department = row[1] ? String(row[1]).trim() : 'Khác';
          const grade = row[2] ? String(row[2]).trim() : '';
          
          // ĐÃ NÂNG CẤP MẪU EXCEL: Cột 4 là Nhóm kiêm nhiệm
          const groupsStr = row[3] ? String(row[3]).trim() : '';
          const groupsArr = groupsStr.split(',').map(s => s.trim()).filter(Boolean);

          addUser({
            name,
            department,
            groups: groupsArr,
            role: 'teacher',
            grade,
          } as any);
          addedCount++;
        }
        alert(`Đã thêm thành công ${addedCount} thành viên từ file Excel.`);
      } catch (err) {
        console.error(err);
        alert('Có lỗi xảy ra khi đọc file Excel. Vui lòng kiểm tra lại định dạng.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Họ và tên', 'Tổ chuyên môn (1 tổ)', 'Khối giảng dạy', 'Nhóm kiêm nhiệm (Nhiều nhóm cách nhau dấu phẩy)'],
      ['Nguyễn Văn A', 'Toán', 'Khối 10', 'Liên tịch, Công đoàn'],
      ['Trần Thị B', 'Văn', 'Khối 11', 'Hội đồng thi']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachNhanSu');
    XLSX.writeFile(wb, 'Mau_DanhSachNhanSu.xlsx');
  };
  
  // Lấy ra danh sách Tổ chuyên môn cố định
  const allUniqueOfficialDepts = Array.from(new Set([
    ...departments,
    ...users.filter(u => u.status === 'approved').map(u => typeof u.department === 'string' ? u.department : 'Chưa phân bổ')
  ])).sort();

  if (isAddingUser || editingUser) {
    return (
      <UserForm 
        initialUser={editingUser || undefined}
        onBack={() => { setIsAddingUser(false); setEditingUser(null); }} 
        onSubmit={(u) => { 
          if (editingUser) {
            updateUser(editingUser.id, { ...u, status: 'approved' });
          } else {
            addUser(u as any); 
          }
          setIsAddingUser(false); 
          setEditingUser(null);
        }} 
        onDelete={() => {
          if (editingUser) {
            deleteUser(editingUser.id);
            setEditingUser(null);
          }
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pointer-events-auto">
      <div className="p-4 bg-white shadow-sm z-10 sticky top-0 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg text-slate-800">Tổ chuyên môn & Nhân sự</h2>
          {(currentUser?.role === 'admin' || currentUser?.role === 'leader') && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadTemplate}
                className="hidden md:flex items-center gap-1 bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-amber-600 transition-colors shadow-sm cursor-pointer"
                title="Tải file mẫu Excel"
              >
                 <Download className="w-4 h-4" /> Form Mẫu
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload} 
                accept=".xlsx, .xls"
                className="hidden"
                id="excel-upload"
              />
              <label 
                htmlFor="excel-upload"
                className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
              >
                <Upload className="w-4 h-4" /> Import Excel
              </label>
              <button 
                onClick={() => setIsAddingUser(true)}
                className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" /> Thêm
              </button>
            </div>
          )}
        </div>
        
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Tìm kiếm theo tên, role..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl pl-9 pr-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all font-medium"
            />
          </div>
          <div className="flex gap-2 items-center min-w-max flex-wrap">
            <select 
              value={filterDept} 
              onChange={e => setFilterDept(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 font-medium text-slate-600"
            >
              <option value="all">Tất cả các Tổ</option>
              {allUniqueOfficialDepts.map(d => <option key={d} value={d}>Tổ {d}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0 items-start">
        {currentUser?.role === 'admin' && users.filter(u => u.status === 'pending' && !users.find(other => other.email === u.email && other.status === 'approved')).length > 0 && (
          <div className="col-span-full mb-4">
            <div className="bg-amber-50 rounded-2xl border border-amber-200 overflow-hidden shadow-sm">
              <div className="bg-amber-100/50 p-3 border-b border-amber-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-amber-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-600" />
                    Chờ phê duyệt
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-sm">
                    {users.filter(u => u.status === 'pending' && !users.find(other => other.email === u.email && other.status === 'approved')).length}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-amber-100">
                {users.filter(u => u.status === 'pending' && !users.find(other => other.email === u.email && other.status === 'approved')).map(user => (
                  <div key={user.id} className="p-3 flex items-center justify-between hover:bg-amber-100/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700 text-sm border border-amber-200 shrink-0">
                        {user.name.split(' ').pop()?.[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-amber-900 truncate">{user.name}</div>
                        <div className="text-[11px] text-amber-700 mt-0.5 truncate">{user.email} • {user.department}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button 
                        onClick={() => updateUser(user.id, { status: 'rejected' })}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors"
                      >
                        Từ chối
                      </button>
                      <button 
                        onClick={() => setEditingUser(user)}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20"
                      >
                        Duyệt & Phân công
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {allUniqueOfficialDepts.map(dept => {
          if (filterDept !== 'all' && dept !== filterDept) return null;
          
          const deptUsers = users.filter(u => {
            if (u.department !== dept) return false;
            if (u.status !== 'approved') return false;
            if (searchQuery) {
               const q = searchQuery.toLowerCase();
               const inGroup = u.groups?.some(g => g.toLowerCase().includes(q));
               return u.name.toLowerCase().includes(q) || u.role.includes(q) || (u.phone && u.phone.includes(q)) || u.email.toLowerCase().includes(q) || inGroup;
            }
            return true;
          });

          if (deptUsers.length === 0) return null;

          return (
            <div key={dept} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
              <div className="bg-slate-100/50 p-3 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    {dept === 'BGH' ? 'Ban Giám Hiệu' : `Tổ ${dept}`}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-slate-500 shadow-sm border border-slate-200">
                    {deptUsers.length} TV
                  </span>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {deptUsers.map(user => (
                  <div key={user.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 text-sm border border-indigo-100 shadow-inner shrink-0">
                        {user.name.split(' ').pop()?.[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-800 truncate">{user.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 max-w-[200px] truncate">
                          {user.grade ? user.grade : 'Chưa phân công'}
                          {user.groups && user.groups.length > 0 && <span className="text-indigo-500 font-medium"> • Nhóm: {user.groups.join(', ')}</span>}
                          {user.phone && ` • ${user.phone}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      {user.role === 'admin' && <Shield className="w-5 h-5 text-rose-500 bg-rose-50 p-1 rounded-md" />}
                      {user.role === 'leader' && <Star className="w-5 h-5 text-amber-500 bg-amber-50 p-1 rounded-md" />}
                      {(currentUser?.role === 'admin' || currentUser?.role === 'leader') && (
                        <button onClick={() => setEditingUser(user)} className="text-slate-400 hover:text-indigo-600 p-1 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {users.length === 0 && (
           <div className="col-span-full py-12 text-center text-slate-400">
             <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
             <p className="font-medium text-sm">Chưa có thành viên nào.</p>
           </div>
        )}
      </div>
    </div>
  );
};
