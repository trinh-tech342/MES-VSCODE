"use client";
import React from 'react';
import { 
  X, Tag, Calendar, User, ImageIcon, 
  CheckCircle2, Loader2, PackageSearch 
} from 'lucide-react';

interface QCDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  lot: any;
  activeSubTab: string;
  isUpdating: boolean;
  onUpdateStatus: (newStatus: boolean) => void;
}

export default function QCDetailPanel({ 
  isOpen, onClose, lot, activeSubTab, isUpdating, onUpdateStatus 
}: QCDetailPanelProps) {
  
  // Kiểm tra lô hàng có thực sự đã được duyệt hay chưa
  // lot.status ở đây là biến Boolean đã được format từ hàm fetchQCData ở cha
  const isPassed = lot?.status === true;

  return (
    <aside className={`fixed top-0 right-0 h-full bg-white shadow-2xl z-[100] transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} w-[420px] border-l border-slate-100 flex flex-col`}>
      {lot ? (
        <>
          {/* HEADER */}
          <div className="p-8 border-b border-slate-50 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 rounded-full ${isPassed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                  Chi tiết kiểm định {activeSubTab}
                </span>
                <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase mt-4 leading-tight">
                  {lot.product_name}
                </h2>
                <p className="text-xs font-bold text-slate-400">SKU: {lot.sku}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-300 transition-colors">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <DetailItem icon={<Tag size={12}/>} label="Số Lô (Lot ID)" value={lot.lot_id} />
              <DetailItem icon={<Calendar size={12}/>} label="Ngày nhập" value={lot.date ? new Date(lot.date).toLocaleDateString('vi-VN') : 'N/A'} />
              <DetailItem icon={<User size={12}/>} label="Nhà cung cấp" value={lot.supplier_name} />
              
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trạng thái hiện tại</span>
                <div className={`flex items-center gap-2 text-xs font-black uppercase ${isPassed ? 'text-emerald-500' : 'text-amber-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${isPassed ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                  {isPassed ? 'Đã phê duyệt (Passed)' : 'Đang chờ duyệt (Pending)'}
                </div>
              </div>
            </div>

            {/* MINH CHỨNG HÌNH ẢNH */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon size={14} className="text-indigo-500" /> Hình ảnh minh chứng
              </h4>
              {lot.evidence_url ? (
                <div className="aspect-video rounded-3xl overflow-hidden border border-slate-100 group relative">
                  <img src={lot.evidence_url} alt="Evidence" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                </div>
              ) : (
                <div className="aspect-video rounded-3xl bg-slate-50 border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 gap-2">
                  <ImageIcon size={32} strokeWidth={1} />
                  <span className="text-[10px] font-bold uppercase italic">Chưa có hình ảnh</span>
                </div>
              )}
            </div>

            {/* GHI CHÚ */}
            <div className="bg-slate-50 p-6 rounded-[2rem] space-y-3 border border-slate-100">
              <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Ghi chú QC</h4>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                {lot.notes || "Chưa có ghi chú cụ thể cho lô hàng này."}
              </p>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="p-8 bg-white border-t border-slate-50 grid grid-cols-2 gap-4">
            {/* NÚT TỪ CHỐI */}
            <button 
              disabled={isUpdating || isPassed}
              onClick={() => onUpdateStatus(false)}
              className="flex flex-col items-center justify-center p-4 rounded-3xl border-2 border-slate-100 hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isUpdating ? <Loader2 className="animate-spin mb-1" size={20} /> : <X size={20} className="mb-1" />}
              <span className="text-[10px] font-black uppercase">Từ chối</span>
            </button>
            
            {/* NÚT PHÊ DUYỆT */}
            <button 
              disabled={isUpdating || isPassed}
              onClick={() => onUpdateStatus(true)}
              className={`flex flex-col items-center justify-center p-4 rounded-3xl transition-all shadow-lg
                ${isPassed 
                  ? 'bg-emerald-500 text-white border-none cursor-default shadow-emerald-100' 
                  : 'bg-slate-900 text-white shadow-slate-200 hover:bg-indigo-600 hover:-translate-y-1'}
              `}
            >
              {isUpdating ? <Loader2 className="animate-spin mb-1" size={20} /> : (
                <>
                  <CheckCircle2 size={20} className="mb-1" />
                  <span className="text-[10px] font-black uppercase">
                    {isPassed ? 'Đã hoàn tất' : 'Phê duyệt ngay'}
                  </span>
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="h-full flex flex-col items-center justify-center p-12 text-center gap-4 text-slate-300">
          <div className="p-6 bg-slate-50 rounded-[2.5rem]"><PackageSearch size={48} strokeWidth={1} /></div>
          <p className="text-xs font-bold uppercase tracking-[0.2em]">Chọn lô hàng để xem</p>
        </div>
      )}
    </aside>
  );
}

function DetailItem({ icon, label, value }: any) {
  return (
    <div className="space-y-1">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">{icon} {label}</span>
      <p className="text-xs font-black text-slate-700 truncate">{value || '---'}</p>
    </div>
  );
}