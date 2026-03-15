"use client";
import React, { useState } from 'react';
import { 
  Search, Loader2, PackageCheck, 
  X, AlertCircle, CheckCircle2, Inbox, Scale, Package
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import QCItemCard from './QCItemCard';

// --- COMPONENT PANEL CHI TIẾT OQC (Drawer Mode) ---
const OQCDetailPanel = ({ lot, onClose, onRefresh }: any) => {
  // Đảm bảo đơn vị luôn tồn tại để hiển thị giao diện
  const unit = lot.unit || 'Cái';
  
  const [actualQty, setActualQty] = useState(lot.output_qty || 0);
  const [issubmitting, setIsSubmitting] = useState(false);
  const [defects, setDefects] = useState({
    packaging: 0,
    quality: 0,
    material: 0
  });

  const totalDefects = defects.packaging + defects.quality + defects.material;
  const finalPassQty = actualQty - totalDefects;

  const handleConfirm = async () => {
    if (finalPassQty < 0) {
      alert(`Lỗi: Tổng số lỗi (${totalDefects} ${unit}) không được lớn hơn sản lượng thực tế!`);
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. Cập nhật bảng batch_records
      const { error: batchError } = await supabase
        .from('batch_records')
        .update({
          output_qty: finalPassQty, // Lưu số lượng ĐẠT chuẩn sau cùng
          qc_status: 'Passed',
          status: 'COMPLETED',
          notes: `OQC: Tổng thu ${actualQty} ${unit}, Tổng lỗi ${totalDefects} ${unit}. (Tự động cập nhật bởi QC)`
        })
        .eq('id', lot.id);

      if (batchError) throw batchError;

      // 2. Ghi log lỗi vào bảng defect_logs (có kèm đơn vị để thống kê chính xác)
      const { error: defectError } = await supabase
        .from('defect_logs')
        .insert([{
          batch_id: lot.id,
          packaging_defects: defects.packaging,
          quality_defects: defects.quality,
          material_defects: defects.material,
          total_defects: totalDefects,
          unit: unit, 
          reported_by: "QC_Staff" 
        }]);

      if (defectError) throw defectError;

      onRefresh(); 
      onClose();   
    } catch (err: any) {
      alert("Lỗi hệ thống: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60] transition-opacity" onClick={onClose} />
      
      <div className="fixed right-0 top-0 h-full w-[450px] bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-[70] animate-in slide-in-from-right duration-500 ease-out flex flex-col">
        {/* Header Panel */}
        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-black italic uppercase text-slate-800 flex items-center gap-2">
              <Scale size={18} className="text-emerald-500" /> Thẩm định lô hàng
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">
              Mã lô: {lot.lot_id} • Đơn vị: <span className="text-emerald-600 font-black">{unit}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-rose-50 hover:text-rose-500 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Card thông tin nhanh */}
          <div className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
             <div className="relative z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thành phẩm</p>
                <h4 className="text-lg font-black text-slate-700 leading-tight">{lot.product_name}</h4>
                <div className="flex items-center gap-2 mt-2">
                   <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-bold">SKU: {lot.sku}</span>
                   <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md font-bold uppercase">{unit}</span>
                </div>
             </div>
             <Package className="absolute -right-2 -bottom-2 text-slate-100" size={80} />
          </div>

          {/* Section A: Sản lượng thực tế */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black uppercase text-emerald-600">Sản lượng nhập xưởng (A)</label>
                <span className="text-[10px] font-bold text-slate-400 italic">Đã đo lường bằng {unit}</span>
            </div>
            <div className="relative group">
              <input 
                type="number"
                className="w-full bg-emerald-50/30 border-2 border-emerald-100 rounded-[2rem] p-6 text-4xl font-black text-emerald-700 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                value={actualQty}
                onChange={(e) => setActualQty(Number(e.target.value))}
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-end">
                <span className="font-black text-emerald-300 uppercase text-xs tracking-tighter">Đơn vị</span>
                <span className="font-black text-emerald-500 uppercase">{unit}</span>
              </div>
            </div>
          </div>

          {/* Section B: Khấu trừ lỗi */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase text-rose-500 ml-1">Phân loại hàng lỗi (B)</label>
            <div className="grid gap-3">
              {[
                { key: 'packaging', label: 'Lỗi Bao bì / Nhãn', color: 'bg-orange-50 text-orange-600 border-orange-100' },
                { key: 'quality', label: 'Lỗi Chất lượng / Cảm quan', color: 'bg-rose-50 text-rose-600 border-rose-100' },
                { key: 'material', label: 'Lỗi Nguyên vật liệu', color: 'bg-amber-50 text-amber-600 border-amber-100' },
              ].map((type) => (
                <div key={type.key} className={`flex items-center justify-between p-4 rounded-2xl border ${type.color.split(' ')[0]} ${type.color.split(' ')[2]}`}>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-tight block opacity-80">{type.label}</span>
                    <span className="text-[9px] font-bold opacity-50 italic">Đơn vị tính: {unit}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-1 shadow-sm border border-slate-100">
                    <input 
                        type="number"
                        className="w-16 bg-transparent border-none p-2 text-right font-black outline-none text-lg text-slate-700"
                        value={defects[type.key as keyof typeof defects]}
                        onChange={(e) => setDefects({...defects, [type.key]: Number(e.target.value)})}
                    />
                    <span className="text-[10px] font-black opacity-30 uppercase">{unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tổng kết nhập kho */}
          <div className="p-8 bg-slate-900 rounded-[3rem] text-white shadow-2xl shadow-slate-300 relative overflow-hidden">
            <div className="relative z-10">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase opacity-40 mb-3 tracking-[0.2em]">
                  <span>Đạt chuẩn nhập kho (A - B)</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-5xl font-black italic text-emerald-400 drop-shadow-md">
                    {finalPassQty.toLocaleString()}
                  </span>
                  <span className="text-sm opacity-40 uppercase font-black tracking-widest">{unit}</span>
                </div>
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-5 rotate-12">
                <PackageCheck size={140} />
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <div className="p-8 border-t bg-white">
          <button 
            disabled={issubmitting}
            onClick={handleConfirm}
            className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] font-black uppercase text-sm tracking-widest hover:bg-emerald-600 shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {issubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <CheckCircle2 size={20} />
                Nhập kho {finalPassQty.toLocaleString()} {unit}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

// --- COMPONENT CHÍNH OQC MANAGER ---
export default function OQCManager({ lots, loading, searchTerm, setSearchTerm, onRefresh }: any) {
  const [selectedLot, setSelectedLot] = useState<any>(null);

  const displayLots = lots.filter((lot: any) =>
    `${lot.product_name} ${lot.lot_id} ${lot.sku}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative">
      <div className="space-y-6 overflow-y-auto pr-2 h-[calc(100vh-220px)] scrollbar-hide">
        
        {/* Search & Header Stats */}
        <div className="bg-white p-3 rounded-[2.5rem] border border-emerald-100 flex flex-col md:flex-row justify-between items-center px-8 shadow-sm sticky top-0 z-10 gap-4">
          <div className="flex items-center gap-4 flex-1 w-full max-w-md">
            <div className="p-2 bg-emerald-50 rounded-full text-emerald-500 shrink-0">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Tìm tên sản phẩm, mã lô hoặc SKU..."
              className="bg-transparent border-none outline-none text-[12px] font-black uppercase w-full placeholder:text-slate-300 italic"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-emerald-500 px-6 py-2.5 rounded-full shadow-lg shadow-emerald-100 shrink-0">
            <PackageCheck size={16} className="text-white" />
            <span className="text-[11px] font-black text-white uppercase tracking-wider">
              {displayLots.length} Lô Đang Chờ OQC
            </span>
          </div>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="py-24 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
            <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Đang kết nối dữ liệu xưởng...</p>
          </div>
        ) : displayLots.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <Inbox size={64} className="text-slate-200 mb-4" />
            <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Không tìm thấy lô hàng nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
            {displayLots.map((lot: any) => (
              <div 
                key={lot.id} 
                onClick={() => setSelectedLot(lot)} 
                className="cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-95"
              >
                <QCItemCard lot={lot} activeSubTab="OQC" isSelected={selectedLot?.id === lot.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer Panel */}
      {selectedLot && (
        <OQCDetailPanel 
          lot={selectedLot} 
          onClose={() => setSelectedLot(null)} 
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}