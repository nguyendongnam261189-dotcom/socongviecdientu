import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { FileText, ExternalLink, Search, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Component con xử lý hiển thị thẻ tài liệu và Modal xem trước
const DocumentCard: React.FC<{ doc: any }> = ({ doc }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.title) || doc.driveUrl.startsWith('data:image/');
  
  // Logic trích xuất ID Google Drive để xem trước
  const driveMatch = doc.driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const fileId = driveMatch ? driveMatch[1] : null;
  const embedUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : doc.driveUrl;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full text-left block bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600 shadow-sm transition-transform group-hover:scale-105">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-slate-800 truncate pr-4">
              {doc.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                {doc.category}
              </span>
              <p className="text-[10px] font-medium text-slate-400 truncate">
                Từ: {doc.sourceTitle}
              </p>
            </div>
            <p className="text-[10px] font-medium text-slate-400 mt-1 tracking-wide uppercase">
              Ngày lưu: {format(parseISO(doc.createdAt), 'dd/MM/yyyy')}
            </p>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
        </div>
      </button>

      {/* Modal xem trước */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 truncate pr-4">{doc.title}</h3>
              <div className="flex gap-2">
                <a href={doc.driveUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                  Mở link gốc
                </a>
                <button onClick={() => setIsOpen(false)} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                  Đóng
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-2 overflow-hidden">
              {isImage ? (
                <img 
                  src={fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200` : doc.driveUrl} 
                  alt={doc.title} 
                  className="w-full h-full object-contain" 
                />
              ) : (
                <iframe src={embedUrl} className="w-full h-full rounded-lg" title="Preview" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const DocumentsView: React.FC = () => {
  const { documents, tasks, documentCategories } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const allDocuments = useMemo(() => {
    const taskDocs = tasks.flatMap(t => 
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
    
    const standaloneDocs = documents.map(d => ({
      ...d,
      category: d.category || 'Khác',
      sourceTitle: 'Tài liệu độc lập'
    }));

    return [...taskDocs, ...standaloneDocs].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [documents, tasks]);

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
      <div className="p-4 bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] z-10 sticky top-0 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm tài liệu..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-transparent rounded-xl text-sm focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-medium text-slate-700 shadow-inner"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setFilterCategory('all')}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
              filterCategory === 'all' 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tất cả
          </button>
          {documentCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                filterCategory === cat 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
          <span>Danh sách tài liệu ({filteredDocs.length})</span>
        </div>
        
        {filteredDocs.map(doc => (
          <DocumentCard key={doc.id} doc={doc} />
        ))}
        {filteredDocs.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm font-medium">
            Không tìm thấy tài liệu phù hợp.
          </div>
        )}
      </div>
    </div>
  );
};
