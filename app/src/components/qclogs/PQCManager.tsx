"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Hash, Package, Loader2 } from 'lucide-react';
import ProductionStepCard from './ProductionStepCard';
import QCModal from './QCModal';
import MaterialUsageModal from './MaterialUsageModal';

export default function PQCManager() {
  const [activeBatches, setActiveBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeModal, setActiveModal] = useState<{
    type: 'QC' | 'MATERIAL' | null,
    data: any
  }>({ type: null, data: null });

const fetchData = useCallback(async (showLoading = true) => {
  if (showLoading) setLoading(true);
  try {
    const [batchesRes, catalogRes] = await Promise.all([
      supabase
        .from('batches')
        .select('*, production_steps (*)')
        .neq('status', 'Completed') // Khớp với status trong Schema batches
        .order('created_at', { ascending: false }),
      supabase
        .from('material_catalog')
        .select('sku, name')
    ]);

    if (batchesRes.error) throw batchesRes.error;

    const catalogMap = new Map(catalogRes.data?.map(i => [i.sku, i.name]));

    if (batchesRes.data) {
      setActiveBatches(batchesRes.data.map(b => ({
        ...b,
        // Lấy tên từ catalog dựa trên cột sku trong bảng batches
        product_name: catalogMap.get(b.sku) || 'Sản phẩm mới (' + b.sku + ')',
        // Sắp xếp các bước sản xuất theo sort_order đã định nghĩa trong Schema
        production_steps: b.production_steps?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []
      })));
    }
  } catch (err) {
    console.error("Lỗi Schema:", err);
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  const handleUpdateLocal = (batchId: string, stepId: string, field: string, value: string) => {
    setActiveBatches(prev => prev.map(b => b.id === batchId ? {
      ...b, production_steps: b.production_steps.map((s:any) => s.id === stepId ? {...s, [field]: value} : s)
    } : b));
  };

  const updateStepStatus = async (batchId: string, stepId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'WAITING' ? 'RUNNING' : 'COMPLETED';
    handleUpdateLocal(batchId, stepId, 'status', nextStatus);
    
    const updatePayload: any = { status: nextStatus };
    if (nextStatus === 'RUNNING') updatePayload.start_time = new Date().toISOString();
    if (nextStatus === 'COMPLETED') updatePayload.end_time = new Date().toISOString();

    await supabase.from('production_steps').update(updatePayload).eq('id', stepId);
    fetchData(false);
  };

  const updateStepDetails = async (batchId: string, stepId: string, field: string, value: string, localOnly = false) => {
    handleUpdateLocal(batchId, stepId, field, value);
    if (!localOnly) {
      await supabase.from('production_steps').update({ [field]: value }).eq('id', stepId);
    }
  };

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 className="animate-spin" size={40} />
        <span className="font-black text-xs uppercase tracking-widest">Đang kết nối hệ thống...</span>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 bg-slate-50 min-h-screen">
      {activeBatches.length > 0 ? (
        activeBatches.map(batch => (
          <div key={batch.id} className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* HEADER CARD */}
            <div className="p-5 border-b flex justify-between items-center bg-white">
              <div className="flex gap-4 items-center">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm">
                  <Package size={20} />
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Lô: {batch.batch_id}</span>
                    <button 
                      onClick={() => setActiveModal({ type: 'MATERIAL', data: batch })} 
                      className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase hover:bg-amber-500 hover:text-white transition-all shadow-sm shadow-amber-100"
                    >
                      Nạp vật tư
                    </button>
                  </div>
                  
                  {/* TÊN SẢN PHẨM HIỆN TẠI ĐÂY */}
                  <h3 className="text-sm font-black text-slate-800 uppercase italic leading-none mb-1 tracking-tight">
                    {batch.product_name}
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{batch.sku}</span>
                    <span className="text-[9px] text-slate-300">•</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Kế hoạch: {batch.planned_qty || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <div className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full uppercase italic ring-1 ring-indigo-100 shadow-sm shadow-indigo-50">
                  Đang sản xuất
                </div>
              </div>
            </div>

            {/* Quy trình các bước */}
            <div className="p-6 flex gap-8 overflow-x-auto scrollbar-hide bg-slate-50/30">
              {batch.production_steps?.map((step: any, i: number) => (
                <ProductionStepCard 
                  key={step.id}
                  step={step}
                  batchId={batch.id}
                  isFirst={i === 0}
                  prevStepDone={i > 0 && batch.production_steps[i-1].status === 'COMPLETED'}
                  onUpdateStatus={updateStepStatus}
                  onUpdateDetails={updateStepDetails}
                  onOpenQC={(s: any) => setActiveModal({ type: 'QC', data: { batch, step: s } })}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="p-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
           <Package size={40} className="mx-auto text-slate-200 mb-4" />
           <p className="font-black text-slate-400 uppercase text-xs">Không có lệnh sản xuất nào đang chạy</p>
        </div>
      )}

      {/* MODALS */}
      {activeModal.type === 'QC' && (
        <QCModal 
          batch={activeModal.data.batch} 
          step={activeModal.data.step} 
          onClose={() => setActiveModal({ type: null, data: null })} 
          onSuccess={() => fetchData(false)} 
        />
      )}

      {activeModal.type === 'MATERIAL' && (
        <MaterialUsageModal 
          batch={activeModal.data} 
          onClose={() => setActiveModal({ type: null, data: null })} 
          onSuccess={() => fetchData(false)} 
        />
      )}
    </div>
  );
}