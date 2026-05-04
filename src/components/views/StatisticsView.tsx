import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { BarChart3, FileSpreadsheet, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, isPast, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { Task, User } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

// HÀM HỖ TRỢ: Kiểm tra xem User có được giao Task hay không (Hỗ trợ cấu trúc Tổ=chuỗi, Nhóm=mảng)
const isUserAssigned = (t: Task, u: User) => {
  if (u.role === 'admin') return false; // Thường thống kê không đếm BGH
  const uDept = typeof u.department === 'string' ? u.department : (Array.isArray(u.department) ? u.department[0] : 'Khác');
  const uGrades = Array.isArray(u.grade) ? u.grade : (u.grade ? [u.grade] : []);
  
  if (t.assignedTo && t.assignedTo.includes(u.id)) return true;
  if (t.targetRoles && t.targetRoles.includes(u.role)) return true;
  if (t.targetDepartments && t.targetDepartments.includes(uDept)) return true;
  if (t.targetGrades && t.targetGrades.some((g: string) => uGrades.includes(g))) return true;
  if (t.visibility === 'public') return true;
  return false;
};

export const StatisticsView: React.FC = () => {
  const { tasks, users, currentUser } = useAppContext();
  
  // Date filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'leader') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  // Filter tasks based on date range and ONLY count Official Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.category !== 'task') return false;
      if (t.isOfficial === false) return false; // LUẬT MỚI: Bỏ qua việc nội bộ không tính thi đua
      const tDate = parseISO(t.createdAt);
      if (startDate && isBefore(tDate, startOfDay(parseISO(startDate)))) return false;
      if (endDate && isAfter(tDate, endOfDay(parseISO(endDate)))) return false;
      return true;
    });
  }, [tasks, startDate, endDate]);

  const stats = useMemo(() => {
    let totalAssigned = 0;
    let totalCompleted = 0;
    let overdue = 0;
    let missingReport = 0;

    filteredTasks.forEach(t => {
      const assignedUsers = users.filter(u => isUserAssigned(t, u));

      if (assignedUsers.length > 0) {
        totalAssigned++; // Đếm theo Task (1 Task = 1 Việc)
        
        const isGlobalDone = t.status === 'done';
        
        // Task được coi là hoàn thành chung nếu TẤT CẢ người được giao đều đã done
        const allDone = isGlobalDone || assignedUsers.every(u => {
          const submission = t.submissions?.find(s => s.userId === u.id);
          return submission?.status === 'done';
        });

        if (allDone) {
          totalCompleted++;
        } else {
          if (t.deadline && isPast(parseISO(t.deadline))) {
            overdue++;
          }
          if (t.reportTemplate && t.reportTemplate.length > 0) {
            missingReport++;
          }
        }
      }
    });

    return {
      totalAssigned,
      totalCompleted,
      completionRate: totalAssigned ? Math.round((totalCompleted / totalAssigned) * 100) : 0,
      overdue,
      missingReport
    };
  }, [filteredTasks, users]);

  // Chart data by department
  const departmentStats = useMemo(() => {
    const deps = new Map<string, { name: string; total: number; completed: number }>();
    
    // Initialize map with all user departments
    users.forEach(u => {
      if (u.role !== 'admin') {
         const uDept = typeof u.department === 'string' ? u.department : (Array.isArray(u.department) ? u.department[0] : 'Khác');
         if (uDept && !deps.has(uDept)) {
           deps.set(uDept, { name: uDept, total: 0, completed: 0 });
         }
      }
    });

    filteredTasks.forEach(t => {
      const involvedDepts = new Set<string>(); // Khử trùng lặp Tổ
      const deptUsersTotal = new Map<string, number>();
      const deptUsersDone = new Map<string, number>();

      users.forEach(u => {
        if (isUserAssigned(t, u)) {
          const uDept = typeof u.department === 'string' ? u.department : (Array.isArray(u.department) ? u.department[0] : 'Khác');
          if (!uDept) return;

          involvedDepts.add(uDept);
          deptUsersTotal.set(uDept, (deptUsersTotal.get(uDept) || 0) + 1);
          
          const sub = t.submissions?.find(s => s.userId === u.id);
          if (sub?.status === 'done' || t.status === 'done') {
             deptUsersDone.set(uDept, (deptUsersDone.get(uDept) || 0) + 1);
          }
        }
      });

      // Chỉ tăng +1 cho Tổ đó, dù trong Tổ có bao nhiêu người được giao Task này
      involvedDepts.forEach(deptName => {
        const stat = deps.get(deptName);
        if (stat) {
          stat.total++; 
          const totalInDept = deptUsersTotal.get(deptName) || 0;
          const doneInDept = deptUsersDone.get(deptName) || 0;
          // Tổ được tính là hoàn thành task nếu tất cả thành viên trong tổ đó đã nộp bài
          if (totalInDept > 0 && totalInDept === doneInDept) {
            stat.completed++;
          }
        }
      });
    });

    return Array.from(deps.values()).sort((a,b) => b.total - a.total);
  }, [filteredTasks, users]);

  const exportExcel = () => {
    // Logic cho Sheet 1: Tổng quan Tổ chuyên môn
    const overviewData = departmentStats.map(d => ({
      'Tổ chuyên môn': d.name,
      'Tổng số việc': d.total,
      'Hoàn thành': d.completed,
      'Chưa hoàn thành': d.total - d.completed,
      'Tỷ lệ (%)': d.total > 0 ? ((d.completed / d.total) * 100).toFixed(1) + '%' : '0%'
    }));
    const ws1 = XLSX.utils.json_to_sheet(overviewData);

    // Logic cho Sheet 2: Chi tiết Giáo viên
    const teacherStats = users.filter(u => u.role !== 'admin').map(u => {
      let tAssigned = 0;
      let tCompleted = 0;
      let tLate = 0;
      const uDept = typeof u.department === 'string' ? u.department : (Array.isArray(u.department) ? u.department[0] : 'Khác');

      filteredTasks.forEach(t => {
        if (isUserAssigned(t, u)) {
          tAssigned++;
          const sub = t.submissions?.find(s => s.userId === u.id);
          if (sub?.status === 'done' || t.status === 'done') {
            tCompleted++;
            if (t.deadline && sub?.submittedAt && isAfter(parseISO(sub.submittedAt), parseISO(t.deadline))) {
              tLate++;
            }
          }
        }
      });

      return {
        'Họ và tên': u.name,
        'Email': u.email,
        'Tổ chuyên môn': uDept,
        'Trạng thái tài khoản': u.status,
        'Số việc được giao': tAssigned,
        'Số việc hoàn thành': tCompleted,
        'Số lần nộp trễ': tLate,
        'Tỷ lệ (%)': tAssigned > 0 ? ((tCompleted / tAssigned) * 100).toFixed(1) + '%' : '0%'
      };
    });
    const ws2 = XLSX.utils.json_to_sheet(teacherStats);

    // Logic cho Sheet 3: Chi tiết Công việc (Sửa lại check reportTemplate)
    const taskDetails = filteredTasks.map(t => {
      const assignedNames = users.filter(u => isUserAssigned(t, u)).map(u => u.name).join(', ');

      return {
        'Tên công việc': t.title,
        'Mô tả': t.description,
        'Trạng thái chung': t.status === 'done' ? 'Hoàn thành' : t.status === 'doing' ? 'Đang làm' : 'Chưa làm',
        'Là báo cáo?': t.reportTemplate && t.reportTemplate.length > 0 ? 'Có' : 'Không',
        'Ngày tạo': format(parseISO(t.createdAt), 'dd/MM/yyyy HH:mm'),
        'Hạn chót': t.deadline ? format(parseISO(t.deadline), 'dd/MM/yyyy') : 'Không có',
        'Số người được giao': assignedNames.split(',').filter(x=>x).length,
        'Người được giao': assignedNames || 'Tất cả'
      };
    });
    const ws3 = XLSX.utils.json_to_sheet(taskDetails);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Tổng quan Tổ");
    XLSX.utils.book_append_sheet(wb, ws2, "Chi tiết Giáo viên");
    XLSX.utils.book_append_sheet(wb, ws3, "Chi tiết Công việc");

    XLSX.writeFile(wb, `Bao_Cao_Truong_Hoc_So_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 shadow-sm z-10 sticky top-0 border-b border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Thống kê & Báo cáo
          </h2>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Xuất báo cáo chi tiết</span>
            <span className="sm:hidden">Xuất file</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 border border-slate-200 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-100 transition-all flex-1 min-w-[200px]">
            <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-700 w-full outline-none flex-1"
            />
          </div>
          <span className="text-slate-400 font-medium">Đến</span>
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 border border-slate-200 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-100 transition-all flex-1 min-w-[200px]">
            <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-700 w-full outline-none flex-1"
            />
          </div>
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1"
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      <div className="p-4 overflow-y-auto space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500 font-medium">Tổng việc giao</p>
            <p className="text-2xl font-black text-indigo-700 mt-1">{stats.totalAssigned}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500 font-medium">Hoàn thành</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{stats.completionRate}%</p>
            <p className="text-xs text-slate-400 mt-1">{stats.totalCompleted} việc</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500 font-medium">Quá hạn</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{stats.overdue}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500 font-medium">Báo cáo chưa nộp</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{stats.missingReport}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4">Biểu đồ tiến độ theo Tổ chuyên môn</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={departmentStats}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }} 
                />
                <RechartsTooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500 }} />
                <Bar name="Tổng số việc" dataKey="total" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar name="Đã hoàn thành" dataKey="completed" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
