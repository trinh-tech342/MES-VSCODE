"use client";
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase'; // Đảm bảo đường dẫn này đúng
import { 
  X, Tag, Calendar, User, ImageIcon, 
  CheckCircle2, Loader2, PackageSearch, Upload, Camera
} from 'lucide-react';

interface QCDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  lot: any;
  activeSubTab: string;
  isUpdating: boolean;
  onUpdateStatus: (newStatus: boolean, updatedUrl?: string) => void; // Thêm updatedUrl
}

export default function QCDetailPanel({ 
  isOpen, onClose, lot, activeSubTab, isUpdating, onUpdateStatus 
}: QCDetailPanelProps) {
  
  const [isUploading, setIsUploading] = useState(false);
  const isPassed = lot?.status === true;

  // HÀM XỬ LÝ UPLOAD ẢNH
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setIsUploading(true);

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${lot.lot_id}-${Math.random()}.${fileExt}`;
      const filePath = `qc-evidence/${fileName}`;

      // 1. Upload lên Storage (Bucket: qc-evidence)
      const { error: uploadError } = await supabase.storage
        .from('qc-evidence')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Lấy Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('qc-evidence')
        .getPublicUrl(filePath);

      // 3. Cập nhật URL vào Database ngay lập tức hoặc chờ nhấn Phê duyệt
      // Ở đây tôi chọn gửi URL về cha để update record
      onUpdateStatus(lot.status, publicUrl); 

    } catch (error: any) {
      alert("Lỗi upload: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <aside className={`fixed top-0 right-0 h-full bg-white shadow-2xl z-[100] transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} w-[420px] border-l border-slate-100 flex flex-col`}>
      {lot ? (
        <>
          {/* HEADER (Giữ nguyên của bạn) */}
          <div className="p-8 border-b border-slate-50 relative overflow-hidden">
             <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 rounded-full ${isPassed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
             <div className="flex justify-between items-start relative z-10">
               <div className="space-y-1">
                 <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                   Chi tiết kiểm định {activeSubTab}
                 </span>
                 <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase mt-4 leading-tight">{lot.product_name}</h2>
                 <p className="text-xs font-bold text-slate-400">SKU: {lot.sku}</p>
               </div>
               <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-300 transition-colors">
                 <X size={24} />
               </button>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {/* THÔNG TIN CHI TIẾT (Giữ nguyên) */}
            <div className="grid grid-cols-2 gap-6">
              <DetailItem icon={<Tag size={12}/>} label="Số Lô (Lot ID)" value={lot.lot_id} />
              <DetailItem icon={<Calendar size={12}/>} label="Ngày nhập" value={lot.date ? new Date(lot.date).toLocaleDateString('vi-VN') : 'N/A'} />
              <DetailItem icon={<User size={12}/>} label="Nhà cung cấp" value={lot.supplier_name} />
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</span>
                <div className={`flex items-center gap-2 text-xs font-black uppercase ${isPassed ? 'text-emerald-500' : 'text-amber-500'}`}>
                   <div className={`w-2 h-2 rounded-full ${isPassed ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                   {isPassed ? 'Đã phê duyệt' : 'Đang chờ duyệt'}
                </div>
              </div>
            </div>

            {/* PHẦN MINH CHỨNG HÌNH ẢNH - NƠI NẠP ẢNH */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon size={14} className="text-indigo-500" /> Hình ảnh minh chứng
                </h4>
                {/* NÚT NẠP ẢNH (Ẩn khi đã Passed) */}
                {!isPassed && (
                  <label className="cursor-pointer group flex items-center gap-2 bg-indigo-50 hover:bg-indigo-600 px-3 py-1.5 rounded-xl transition-all">
                    {isUploading ? <Loader2 size={12} className="animate-spin text-indigo-500" /> : <Camera size={12} className="text-indigo-500 group-hover:text-white" />}
                    <span className="text-[9px] font-black text-indigo-600 group-hover:text-white uppercase">Chụp ảnh</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />
                  </label>
                )}
              </div>

              {lot.evidence_url || isUploading ? (
                <div className="aspect-video rounded-3xl overflow-hidden border border-slate-100 group relative bg-slate-100">
                  {isUploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                      <Loader2 className="animate-spin text-indigo-500" />
                    </div>
                  ) : null}
                  <img 
                    src={lot.evidence_url} 
                    alt="Evidence" 
                    className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${isUploading ? 'blur-sm' : ''}`} 
                  />
                  {!isPassed && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-[10px] font-bold uppercase">Thay đổi hình ảnh</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 gap-2">
                  <ImageIcon size={32} strokeWidth={1} />
                  <span className="text-[10px] font-bold uppercase italic">Chưa có hình ảnh minh chứng</span>
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

          {/* ACTIONS (Giữ nguyên) */}
          <div className="p-8 bg-white border-t border-slate-50 grid grid-cols-2 gap-4">
             {/* ... Nút từ chối & Phê duyệt ... */}
             <button 
              disabled={isUpdating || isPassed}
              onClick={() => onUpdateStatus(false)}
              className="flex flex-col items-center justify-center p-4 rounded-3xl border-2 border-slate-100 hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isUpdating ? <Loader2 className="animate-spin mb-1" size={20} /> : <X size={20} className="mb-1" />}
              <span className="text-[10px] font-black uppercase">Từ chối</span>
            </button>
            
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

// ... Function DetailItem giữ nguyên

function DetailItem({ icon, label, value }: any) {
  return (
    <div className="space-y-1">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">{icon} {label}</span>
      <p className="text-xs font-black text-slate-700 truncate">{value || '---'}</p>
    </div>
  );
}