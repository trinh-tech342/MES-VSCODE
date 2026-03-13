"use client";
import React, { useState, useMemo } from 'react';
import { Package, Plus, X, Search, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function SkuSidebar({ configs, selectedSku, onSelect, onAddSku, saving }: any) {
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newSku, setNewSku] = useState({ sku: '', product_name: '' });
  
  // --- LOGIC PHÂN TRANG ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Số lượng SKU trên mỗi trang

  // 1. Lọc dữ liệu theo Search
  const filteredConfigs = useMemo(() => {
    const result = configs.filter((item: any) => 
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setCurrentPage(1); // Reset về trang 1 khi gõ tìm kiếm
    return result;
  }, [configs, searchTerm]);

  // 2. Tính toán các chỉ số phân trang
  const totalPages = Math.ceil(filteredConfigs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredConfigs.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="col-span-12 md:col-span-4 bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden self-start sticky top-6 flex flex-col h-[calc(100vh-48px)]">
      
      {/* HEADER & SEARCH */}
      <div className="shrink-0">
        <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center">
          <h3 className="font-black flex items-center gap-2 text-xs uppercase tracking-widest"><Package size={18}/> Danh mục ({filteredConfigs.length})</h3>
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className={`${isCreating ? 'bg-rose-500' : 'bg-blue-500'} p-2 rounded-xl transition-all shadow-lg active:scale-95`}
          >
            {isCreating ? <X size={16} /> : <Plus size={16} />}
          </button>
        </div>

        <div className="p-4 border-b border-slate-50 bg-white">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              className="w-full bg-slate-50 border-none rounded-xl py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="Tìm kiếm nhanh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* FORM THÊM MỚI */}
      {isCreating && (
        <div className="p-5 bg-blue-50/50 border-b border-blue-100 space-y-3 shrink-0">
          <input 
            placeholder="Mã SKU (In hoa)..."
            className="w-full p-3 rounded-xl border-white text-sm font-bold uppercase outline-none shadow-sm"
            value={newSku.sku}
            onChange={e => setNewSku({...newSku, sku: e.target.value.toUpperCase().trim()})}
          />
          <input 
            placeholder="Tên sản phẩm..."
            className="w-full p-3 rounded-xl border-white text-sm outline-none shadow-sm"
            value={newSku.product_name}
            onChange={e => setNewSku({...newSku, product_name: e.target.value})}
          />
          <button 
            onClick={() => { onAddSku(newSku); setIsCreating(false); setNewSku({sku:'', product_name:''}); }}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors"
            disabled={saving}
          >
            Xác nhận thêm
          </button>
        </div>
      )}

      {/* DANH SÁCH SẢN PHẨM (SCROLLABLE) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-50">
        {paginatedItems.length > 0 ? (
          paginatedItems.map((item: any) => (
            <button 
              key={item.id} 
              onClick={() => onSelect(item)} 
              className={`w-full p-5 text-left flex justify-between items-center transition-all group ${selectedSku?.sku === item.sku ? 'bg-blue-50 border-r-4 border-blue-500' : 'hover:bg-slate-50'}`}
            >
              <div className="overflow-hidden">
                <p className={`font-black text-[10px] uppercase ${selectedSku?.sku === item.sku ? 'text-blue-600' : 'text-slate-400'}`}>{item.sku}</p>
                <p className="font-bold text-slate-700 text-sm truncate">{item.product_name}</p>
              </div>
              <ChevronRight size={16} className={`transition-transform ${selectedSku?.sku === item.sku ? 'text-blue-500 translate-x-1' : 'text-slate-200 group-hover:text-slate-400'}`} />
            </button>
          ))
        ) : (
          <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Không tìm thấy sản phẩm</div>
        )}
      </div>

      {/* THANH PHÂN TRANG (STICKY BOTTOM) */}
      {totalPages > 1 && (
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex gap-1">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition-colors shadow-sm"
            >
              <ChevronsLeft size={16} />
            </button>
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition-colors shadow-sm"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
             Trang {currentPage} / {totalPages}
          </span>

          <div className="flex gap-1">
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition-colors shadow-sm"
            >
              <ChevronRight size={16} />
            </button>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition-colors shadow-sm"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}