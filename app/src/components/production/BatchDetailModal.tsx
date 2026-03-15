"use client";
import React, { useState } from 'react';
import { 
  X, FlaskConical, ClipboardList, User, 
  Package, AlertTriangle, Trash2 
} from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Đảm bảo đường dẫn này chính xác

interface BatchDetailModalProps {
  batch: any;
  onClose: () => void;
}

export default function BatchDetailModal({ batch, onClose }: BatchDetailModalProps) {
  const [isCancelling, setIsCancelling] = useState(false);

  if (!batch) return null;

  // Logic xử lý hủy lô hàng
  const handleCancelBatch = async () => {
    const confirmMessage = `XÁC NHẬN HỦY LÔ: ${batch.batch_id}?\n\nLưu ý: Hành động này sẽ dừng mọi công đoạn và được ghi lại trong nhật ký hệ thống (Audit Logs).`;
    
    if (!window.confirm(confirmMessage)) return;

    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('batches')
        .update({ 
          status: 'CANCELLED',
          updated_at: new Date().toISOString()
        })
        .eq('id', batch.id);

      if (error) throw error;
      
      alert('Đã hủy lô sản xuất thành công.');
      onClose(); 
    } catch (error: any) {
      console.error("Cancel Batch Error:", error);
      alert('Lỗi khi hủy: ' + error.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const isCancelled = batch.status === 'CANCELLED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* HEADER: Màu sắc thay đổi theo trạng thái */}
        <div className={`p-6 border-b border-slate-100 flex justify-between items-center text-white transition-colors duration-500 ${isCancelled ? 'bg-slate-500' : 'bg-indigo-600'}`}>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-2xl font-black tracking-tighter uppercase">LÔ: {batch.batch_id}</h3>
              
              {isCancelled ? (
                <span className="bg-red-500 px-3 py-1 rounded-full text-[10px] font-black border border-white/50 flex items-center gap-1">
                  <AlertTriangle size={10} /> ĐÃ HỦY
                </span>
              ) : (
                batch.type === 'Customer' ? (
                  <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold border border-white/30 flex items-center gap-1">
                    <User size={10} /> ĐƠN ĐẶT HÀNG
                  </span>
                ) : (
                  <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold border border-white/20 flex items-center gap-1">
                    <Package size={10} /> DỰ TRỮ KHO
                  </span>
                )
              )}
            </div>

            <p className="text-indigo-100 text-sm font-black uppercase tracking-wide">
              Sản phẩm: {batch.product_display_name || batch.sku || 'N/A'}
            </p>

            <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mt-1">
              KHÁCH HÀNG: {batch.customer || 'NỘI BỘ'} 
              {batch.order_number && ` | ĐH: ${batch.order_number}`}
              {` | SKU: ${batch.sku} | SL: ${batch.planned_qty}`}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/20 rounded-full transition-colors ml-4"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto space-y-10">
          
          {/* PHẦN 1: VẬT TƯ TIÊU HAO */}
          <div>
            <h4 className="flex items-center gap-2 text-slate-800 font-black uppercase text-sm mb-4">
              <FlaskConical size={18} className="text-indigo-600" /> Vật tư tiêu hao thực tế
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {batch.batch_material_usage?.length > 0 ? (
                batch.batch_material_usage.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">Nguyên liệu</span>
                      <span className="font-bold text-slate-700">{item.material_lots?.material_name || 'N/A'}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">Lượng dùng</span>
                      <span className="font-black text-indigo-600">
                        {item.actual_quantity} {item.material_lots?.unit || 'kg'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs italic bg-slate-50 p-4 rounded-xl w-full col-span-2 text-center border-2 border-dashed border-slate-100">
                  Chưa ghi nhận vật tư tiêu hao cho lô này.
                </p>
              )}
            </div>
          </div>

          {/* PHẦN 2: NHẬT KÝ CÔNG ĐOẠN */}
          <div>
            <h4 className="flex items-center gap-2 text-slate-800 font-black uppercase text-sm mb-4">
              <ClipboardList size={18} className="text-indigo-600" /> Nhật ký công đoạn
            </h4>
            <div className="space-y-4">
              {batch.production_steps?.length > 0 ? (
                batch.production_steps
                  .sort((a: any, b: any) => a.sort_order - b.sort_order)
                  .map((step: any) => (
                    <div key={step.id} className={`border p-4 rounded-2xl flex justify-between items-center shadow-sm transition-opacity ${isCancelled ? 'opacity-50' : 'bg-white border-slate-100'}`}>
                      <div>
                        <p className="font-black text-slate-800 uppercase text-xs">{step.step_name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          Thực hiện: {step.operator_name || 'Chưa xác định'}
                        </p>
                      </div>
                      <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter ${
                        step.status === 'COMPLETED' 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : 'bg-orange-50 text-orange-600 border border-orange-100'
                      }`}>
                        {step.status}
                      </span>
                    </div>
                  ))
              ) : (
                <p className="text-slate-400 text-xs italic text-center py-4">Chưa có dữ liệu công đoạn.</p>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER: Nơi chứa nút hủy an toàn */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <div>
            {!isCancelled && batch.status !== 'Completed' && (
              <button 
                onClick={handleCancelBatch}
                disabled={isCancelling}
                className="flex items-center gap-2 px-5 py-2.5 text-red-600 font-black hover:bg-red-50 rounded-xl transition-all text-[11px] uppercase tracking-wider disabled:opacity-50"
              >
                <Trash2 size={16} />
                {isCancelling ? 'Đang xử lý...' : 'Hủy lệnh sản xuất'}
              </button>
            )}
          </div>
          
          <button 
            onClick={onClose} 
            className="px-8 py-3 bg-slate-800 text-white font-black rounded-2xl uppercase text-[12px] shadow-lg active:scale-95 transition-transform hover:bg-slate-700"
          >
            Đóng hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
}