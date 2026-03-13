"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  QrCode, Box, ArrowRight, Calendar, User, 
  CheckCircle2, AlertCircle, FileText, ChevronRight 
} from 'lucide-react';

export default function TraceabilityReport({ batchId }: { batchId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTraceabilityData() {
      setLoading(true);
      
      // 1. Lấy thông tin tổng quan của Lô Sản Xuất
      const { data: batch } = await supabase
        .from('batches')
        .select(`*, production_steps(*)`)
        .eq('batch_id', batchId)
        .single();

      // 2. Lấy danh sách nguyên liệu đã nạp (Truy xuất ngược)
      // Liên kết qua material_lots để lấy tên vật tư và nhà cung cấp
      const { data: usages } = await supabase
        .from('batch_material_usage')
        .select(`
          actual_quantity,
          unit,
          created_at,
          material_lots (
            lot_number,
            material_name,
            supplier_name,
            mfg_date,
            expiry_date,
            status
          )
        `)
        .eq('batch_id', batchId);

      setData({ batch, usages });
      setLoading(false);
    }

    if (batchId) fetchTraceabilityData();
  }, [batchId]);

  if (loading) return <div className="p-10 text-center animate-pulse">Đang truy xuất dữ liệu...</div>;
  if (!data?.batch) return <div className="p-10 text-center text-red-500">Không tìm thấy mã lô này!</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* HEADER: THÔNG TIN LÔ HÀNG TỔNG QUÁT */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <QrCode size={120} />
        </div>
        
        <div className="relative z-10">
          <span className="px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
            Phiếu Truy Xuất Nguồn Gốc
          </span>
          <h1 className="text-4xl font-black text-slate-800 mt-4 tracking-tighter uppercase">
            #{data.batch.batch_id}
          </h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
            <InfoBox label="Sản phẩm" value={data.batch.product_name || data.batch.sku} />
            <InfoBox label="Ngày SX" value={new Date(data.batch.created_at).toLocaleDateString('vi-VN')} />
            <InfoBox label="Trạng thái" value={data.batch.status} highlight />
            <InfoBox label="Số lượng TP" value={`${data.batch.planned_quantity || 0} ${data.batch.unit || 'Kg'}`} />
          </div>
        </div>
      </div>

      {/* THÀNH PHẦN NGUYÊN LIỆU (CÂY PHẢ HỆ) */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
          <Box size={14} /> Danh mục nguyên liệu cấu thành
        </h3>
        
        <div className="grid gap-3">
          {data.usages?.map((item: any, idx: number) => (
            <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-all shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-indigo-500 font-bold group-hover:bg-indigo-50">
                  {idx + 1}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-700 uppercase leading-none mb-1">
                    {item.material_lots.material_name}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">
                    Số lô: <span className="text-indigo-500">{item.material_lots.lot_number}</span> • NCC: {item.material_lots.supplier_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-xs font-black text-slate-800">{item.actual_quantity} {item.unit}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Khối lượng nạp</p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black flex items-center gap-1.5 ${
                  item.material_lots.status === 'Passed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  {item.material_lots.status === 'Passed' ? <CheckCircle2 size={12}/> : <AlertCircle size={12}/>}
                  {item.material_lots.status?.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LỊCH SỬ CÔNG ĐOẠN (PRODUCTION STEPS) */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Nhật ký sản xuất (SOP)</h3>
        <div className="space-y-6">
          {data.batch.production_steps?.map((step: any, idx: number) => (
            <div key={idx} className="flex gap-4 relative">
              {idx !== data.batch.production_steps.length - 1 && (
                <div className="absolute left-2.5 top-6 w-[1px] h-full bg-slate-700" />
              )}
              <div className={`w-5 h-5 rounded-full z-10 flex items-center justify-center ${step.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                {step.status === 'COMPLETED' && <CheckCircle2 size={12} />}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-black uppercase tracking-wide">{step.step_name}</p>
                  <span className="text-[9px] text-slate-500 font-mono italic">
                    {step.end_time ? new Date(step.end_time).toLocaleTimeString() : '---'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 italic">{step.notes || "Không có ghi chú"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value, highlight }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-black ${highlight ? 'text-indigo-600' : 'text-slate-700'} truncate`}>{value || '---'}</p>
    </div>
  );
}