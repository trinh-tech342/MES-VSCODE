"use client";
import React, { useMemo, useState } from 'react';
import { Search, Loader2, Package, CheckCircle, Clock, X, AlertOctagon } from 'lucide-react';
import QCItemCard from './QCItemCard';

export default function IQCManager({ 
  lots, 
  loading, 
  searchTerm, 
  setSearchTerm, 
  onOpenDetail, 
  viewingLotId, 
  isSidePanelOpen 
}: any) {
  // Trạng thái lọc: Tất cả | Đạt | Chờ | Lỗi
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'pending' | 'failed'>('all');

  // 1. LOGIC THỐNG KÊ: Phân loại rạch ròi theo giá trị đã Mapping từ QCTab
  const stats = useMemo(() => ({
    total: lots.length,
    passed: lots.filter((l: any) => l.status === true).length,
    pending: lots.filter((l: any) => l.status === null).length,
    failed: lots.filter((l: any) => l.status === false).length,
  }), [lots]);

  // 2. LOGIC LỌC DANH SÁCH HIỂN THỊ
  const displayLots = useMemo(() => {
    return lots.filter((lot: any) => {
      // Lọc theo từ khóa tìm kiếm
      const matchSearch = (lot.product_name + lot.lot_id + lot.sku).toLowerCase().includes(searchTerm.toLowerCase());
      
      // Lọc theo trạng thái Tab
      let matchStatus = true;
      if (statusFilter === 'passed') matchStatus = lot.status === true;
      if (statusFilter === 'pending') matchStatus = lot.status === null;
      if (statusFilter === 'failed') matchStatus = lot.status === false;

      return matchSearch && matchStatus;
    });
  }, [lots, searchTerm, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* STATS STRIP - Thanh trạng thái lọc */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        <MiniStatCard 
          icon={<Package size={14} />} 
          label="Tất cả" 
          value={stats.total} 
          active={statusFilter === 'all'} 
          onClick={() => setStatusFilter('all')} 
          color="bg-slate-500" 
        />
        <MiniStatCard 
          icon={<Clock size={14} />} 
          label="Chờ duyệt" 
          value={stats.pending} 
          active={statusFilter === 'pending'} 
          onClick={() => setStatusFilter('pending')} 
          color="bg-amber-500" 
        />
        <MiniStatCard 
          icon={<CheckCircle size={14} />} 
          label="Đạt chuẩn" 
          value={stats.passed} 
          active={statusFilter === 'passed'} 
          onClick={() => setStatusFilter('passed')} 
          color="bg-emerald-500" 
        />
        <MiniStatCard 
          icon={<AlertOctagon size={14} />} 
          label="Không đạt" 
          value={stats.failed} 
          active={statusFilter === 'failed'} 
          onClick={() => setStatusFilter('failed')} 
          color="bg-rose-500" 
        />
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center gap-4 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm px-4">
        <Search size={16} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="Tìm tên, SKU, Lô..." 
          className="bg-transparent border-none outline-none text-xs font-bold uppercase w-full py-2" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        {searchTerm && <X size={14} className="cursor-pointer text-slate-300" onClick={() => setSearchTerm("")} />}
      </div>

      {/* RENDER LIST */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
        </div>
      ) : (
        <div className={`grid gap-4 transition-all duration-500 ${
          isSidePanelOpen 
            ? 'grid-cols-1 lg:grid-cols-2' 
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
          {displayLots.length > 0 ? (
            displayLots.map((lot: any) => (
              <div key={lot.id} onClick={() => onOpenDetail(lot)}>
                <QCItemCard lot={lot} isSelected={viewingLotId === lot.id && isSidePanelOpen} />
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
              <Package size={40} className="mx-auto text-slate-200 mb-2" />
              <p className="text-slate-400 text-xs font-bold uppercase">Không có dữ liệu phù hợp</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStatCard({ icon, label, value, active, onClick, color }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all whitespace-nowrap ${
        active 
          ? `border-transparent text-white ${color} shadow-lg shadow-indigo-100` 
          : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
      }`}
    >
      {icon}
      <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
      <span className={`text-xs font-black px-1.5 rounded-md ${active ? 'bg-white/20' : 'bg-slate-100'}`}>
        {value}
      </span>
    </button>
  );
}