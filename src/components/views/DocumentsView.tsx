import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { FileText, Search, Download, FileImage, FileSpreadsheet, X, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '../../utils';

// Hàm hỗ trợ nhận diện định dạng file để render Icon và Màu sắc cho ngầu
const getFileInfo = (title: string, url: string) => {
  const t = title.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(t) || url.startsWith('data:image/')) {
    return { icon: FileImage, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-100' };
  }
  if (/\.(xlsx|xls|csv)$/i.test(t) || url.includes('spreadsheet')) {
    return { icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' };
  }
  if (/\.(pdf)$/i.test(t)) {
    return { icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' };
  }
  // Mặc định (Word, PPT, Khác)
  return { icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' };
};

// Component thẻ tài liệu
const DocumentCard: React.FC<{ doc: any }> = ({ doc }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.title) || doc.driveUrl.startsWith('data:image/');
  
  // Logic trích xuất ID Google Drive để xem trước
  const driveMatch = doc.driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const fileId = driveMatch ? driveMatch[1] : null;
  const embedUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : doc.driveUrl;
  const downloadUrl = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : doc.driveUrl;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(downloadUrl, '_blank');
  };

  const fileInfo = getFileInfo(doc.title, doc.driveUrl);
  const IconComponent = fileInfo.icon;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group overflow-hidden h-full text-left"
      >
        {/* Nửa trên: Icon bự & Nút thao tác nhanh */}
        <div className={cn("w-full h-24 flex items-center justify-center relative transition-colors", fileInfo.bg)}>
           <IconComponent className={cn("w-10 h-10 transition-transform group-hover:scale-110", fileInfo.color)} />
           
           {/* Overlay Nút tải & Xem khi Hover (Desktop) */}
           <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
              <div className="bg-white/90 p-1.5 rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-white transition-colors" title="Xem trước">
                 <Eye className="w-4 h-4" />
              </div>
              <div 
                 onClick={handleDownload} 
                 className="bg-white/90 p-1.5 rounded-lg text-slate-700 hover:text-emerald-600 hover:bg-white transition-colors" title="Tải xuống"
              >
                 <Download className="w-4 h-4" />
              </div>
           </div>
        </div>

        {/* Nửa dưới: Thông tin */}
        <div className="p-3 flex-1 flex flex-col justify-between w-full">
           <div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-500 mb-1.5 inline-block">
                {doc.category}
              </span>
              <h3 className="font-bold text-sm text-slate-800 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                {doc.title}
              </h3>
           </div>
           
           <div className="mt-2 pt-2 border-t border-slate-100">
              <p className="text-[9px] font-medium text-slate-400 truncate">
                Nguồn: {doc.sourceTitle}
              </p>
              <p className="text-[9px] font-medium text-slate-400 uppercase mt-0.5">
                {format(parseISO(doc.createdAt), 'dd/MM/yyyy')}
              </p>
           </div>
        </div>
      </button>

      {/* Modal xem trước (Giữ nguyên logic cực mượt của thầy) */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
        >
          <div 
            className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden relative pointer-events-auto"
            onClick={(e) => e.stopPropagation()} 
          >
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-3 pr-4 flex-1 overflow-hidden">
                <div className={cn("p-1.5 rounded-lg border hidden sm:block", fileInfo.bg, fileInfo.border)}>
                   <IconComponent className={cn("w-4 h-4", fileInfo.color)} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-slate-800 truncate">{doc.title}</h3>
              </div>
              <div className="flex gap-2 shrink-0 items-center">
                <button 
                  onClick={handleDownload}
                  className="px-3 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Tải xuống</span>
                </button>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="p-2 text-slate-400 hover:text-rose-500 bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-100 relative overflow-hidden">
              {isImage ? (
                <img 
                  src={fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200` : doc.driveUrl} 
                  alt={doc.title} 
                  className="w-full h-full object-contain p-2" 
                />
              ) : (
                <iframe src={embedUrl} className="w-full h-full border-0" title="Preview" loading="lazy" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const DocumentsView: React.FC = () => {
  const { documents, tasks, documentCategories, currentUser, users } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const allDocuments = useMemo(() => {
    // Chỉ lấy tài liệu từ những tasks mà user được phép nhìn thấy
    const visibleTasks = tasks.filter(t => {
       const isCreator = t.createdBy === currentUser?.id;
       const isAssigned = t.assignedTo?.includes(currentUser?.id || '');
       const isRole = t.targetRoles?.includes(currentUser?.role || '');
       const isDept = t.targetDepartments?.includes(currentUser?.department || '');
       const isGrade = t.targetGrades?.includes(currentUser?.grade || '');
       const isPublic = t.visibility === 'public';
       return !!(isCreator || isAssigned || isRole || isDept || isGrade || isPublic);
    });

    const taskDocs = visibleTasks.flatMap(t => 
      (t.attachments || []).map((att, idx) => ({
        id: `${t.id}-att-${idx}`,
        title: att.title || 'Tài liệu không tên',
        driveUrl: att.url,
        category: att.category || 'Khác',
        createdAt: t.createdAt,
        createdBy: t.createdBy,
        sourceTitle: t.title
      }))
    );
    
    // (Sau này nếu có logic bảo mật cho Standalone Docs thì thêm vào đây)
    const standaloneDocs = documents.map(d => ({
      ...d,
      category: d.category || 'Khác',
      sourceTitle: 'Tài liệu độc lập'
    }));

    return [...taskDocs, ...standaloneDocs].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [documents, tasks, currentUser]);

  const filteredDocs = useMemo(() => {
    return allDocuments.filter(doc => {
      if (filterCategory !== 'all' && doc.category !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return doc.title.toLowerCase().includes(q) || doc.sourceTitle.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allDocuments, filterCategory, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* HEADER BỘ LỌC CỐ ĐỊNH */}
      <div className="p-4 bg-white shadow-sm z-10 sticky top-0 space-y-3 border-b border-slate-200">
        <div className="flex justify-between items-center mb-1">
            <h2 className="font-bold text-lg text-slate-800">Kho Tài Liệu</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo tên file, nguồn gốc..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-transparent rounded-xl text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-medium text-slate-700 shadow-inner"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
          <button
            onClick={() => setFilterCategory('all')}
            className={`shrink-0 px-4 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-bold transition-all border ${
              filterCategory === 'all' 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tất cả
          </button>
          {documentCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-bold transition-all border ${
                filterCategory === cat 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      
      {/* VÙNG LƯỚI TÀI LIỆU (GRID VIEW) */}
      <div className="flex-1 p-4 pb-24 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex justify-between">
          <span>Tìm thấy {filteredDocs.length} tài liệu</span>
        </div>
        
        {/* GRID LAYOUT: Mobile 2 cột, Tablet 3 cột, Desktop 4 cột */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredDocs.map(doc => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>

        {filteredDocs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
               <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm font-bold">Thư mục trống</p>
            <p className="text-slate-400 text-xs mt-1">Không tìm thấy tài liệu nào phù hợp với bộ lọc.</p>
          </div>
        )}
      </div>
    </div>
  );
};
