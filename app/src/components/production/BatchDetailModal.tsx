"use client";
import React from 'react';
import { X, FlaskConical, ClipboardList } from 'lucide-react';

interface BatchDetailModalProps {
  batch: any;
  onClose: () => void;
}

export default function BatchDetailModal({ batch, onClose }: BatchDetailModalProps) {
  if (!batch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* HEADER: Thông tin lô, sản phẩm và đơn hàng */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-2xl font-black tracking-tighter uppercase">LÔ: {batch.batch_id}</h3>
              <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold border border-white/30">
                ĐH: {batch.order_number || 'N/A'}
              </span>
            </div>
            <p className="text-indigo-100 text-sm font-bold uppercase tracking-wide">
              Sản phẩm: {batch.product_name || 'N/A'}
            </p>
            <p className="text-indigo-200 text-[10px] font-medium uppercase tracking-widest mt-1">
              {/* Kiểm tra batch.orders.customer trước, nếu không có mới xét đến batch.customer */}
              Khách hàng: {batch.orders?.customer_name || batch.customer || 'Khách lẻ'} 
              | SKU: {batch.sku} | SL: {batch.planned_qty}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
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
              {batch.batch_material_usage && batch.batch_material_usage.length > 0 ? (
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
                <p className="text-slate-400 text-xs italic bg-slate-50 p-4 rounded-xl w-full col-span-2 text-center">
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
                    <div key={step.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                      <div>
                        <p className="font-black text-slate-800 uppercase text-xs">{step.step_name}</p>
                        <p className="text-[10px] text-slate-500">
                          Thực hiện: {step.operator_name || 'Chưa xác định'}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-4 py-1.5 rounded-full ${
                        step.status === 'COMPLETED' 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : 'bg-orange-50 text-orange-600 border border-orange-100'
                      }`}>
                        {step.status}
                      </span>
                    </div>
                  ))
              ) : (
                <p className="text-slate-400 text-xs italic text-center">Chưa có dữ liệu công đoạn.</p>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose} 
            className="px-8 py-3 bg-slate-800 text-white font-black rounded-2xl uppercase text-sm shadow-lg active:scale-95 transition-transform"
          >
            Đóng hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
}