"use client";
import React from 'react';
import { Package, Calendar, ChevronRight,Truck } from 'lucide-react';

export default function QCItemCard({ lot, isSelected }: any) {
  const isPassed = lot.status === true || lot.status === 'Passed';
  
  return (
    <div className={`
      relative group cursor-pointer transition-all duration-300 rounded-2xl border-2 p-4 h-full
      ${isSelected 
        ? 'bg-indigo-600 border-indigo-600 shadow-lg -translate-y-1' 
        : 'bg-white border-slate-50 hover:border-indigo-100 hover:shadow-md'}
    `}>
      <div className="flex justify-between items-start mb-3">
        <div className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
          {lot.sku}
        </div>
        <div className={`w-2 h-2 rounded-full ${isPassed ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      <h3 className={`text-xs font-black leading-tight uppercase mb-4 line-clamp-2 ${isSelected ? 'text-white' : 'text-slate-700'}`}>
        {lot.product_name}
      </h3>
      {/* --- PHẦN HIỂN THỊ NHÀ CUNG CẤP --- */}
      <div className="flex items-center gap-1.5 mb-4">
        <Truck size={10} className={`${isSelected ? 'text-indigo-200' : 'text-indigo-500'}`} />
        <span className={`text-[9px] font-bold uppercase truncate ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
          {lot.supplier_name || 'N/A'}
        </span>
      </div>
      {/* ---------------------------------- */}
      <div className="flex items-center justify-between mt-auto">
        <div className="flex flex-col">
          <span className={`text-[8px] font-bold uppercase ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>Lot Number</span>
          <span className={`text-[10px] font-black italic ${isSelected ? 'text-white' : 'text-indigo-600'}`}>#{lot.lot_id}</span>
        </div>
        
        <div className={`p-1.5 rounded-lg transition-all ${isSelected ? 'bg-white/10 text-white' : 'text-slate-300 group-hover:text-indigo-500'}`}>
          <ChevronRight size={14} />
        </div>
      </div>
      
      {/* Chỉ báo ngày mỏng dưới cùng */}
      <div className={`absolute bottom-0 left-4 right-4 h-[1px] ${isSelected ? 'bg-white/10' : 'bg-slate-50'}`} />
    </div>
  );
}