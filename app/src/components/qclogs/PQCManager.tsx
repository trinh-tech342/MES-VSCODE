"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Hash } from 'lucide-react';
import ProductionStepCard from './ProductionStepCard';
import QCModal from './QCModal';
import MaterialUsageModal from './MaterialUsageModal';

export default function PQCManager() {
  const [activeBatches, setActiveBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Chỉ dùng 1 state duy nhất để quản lý các Modals cho đỡ rối
  const [activeModal, setActiveModal] = useState<{
    type: 'QC' | 'MATERIAL' | null,
    data: any
  }>({ type: null, data: null });

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data } = await supabase
      .from('batches')
      .select(`*, production_steps (*)`)
      .neq('status', 'Completed')
      .order('created_at', { ascending: false });
    
    if (data) {
      setActiveBatches(data.map(b => ({ 
        ...b, 
        production_steps: b.production_steps?.sort((a: any, b: any) => a.sort_order - b.sort_order) 
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdateLocal = (batchId: string, stepId: string, field: string, value: string) => {
    setActiveBatches(prev => prev.map(b => b.id === batchId ? {
      ...b, production_steps: b.production_steps.map((s:any) => s.id === stepId ? {...s, [field]: value} : s)
    } : b));
  };

  const updateStepStatus = async (batchId: string, stepId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'PENDING' ? 'RUNNING' : 'COMPLETED';
    handleUpdateLocal(batchId, stepId, 'status', nextStatus);
    await supabase.from('production_steps').update({ 
        status: nextStatus, 
        ...(nextStatus === 'RUNNING' ? { start_time: new Date().toISOString() } : { end_time: new Date().toISOString() }) 
    }).eq('id', stepId);
    fetchData(false);
  };

  const updateStepDetails = async (batchId: string, stepId: string, field: string, value: string, localOnly = false) => {
    handleUpdateLocal(batchId, stepId, field, value);
    if (!localOnly) {
      await supabase.from('production_steps').update({ [field]: value }).eq('id', stepId);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-400 uppercase">Đang đồng bộ...</div>;

  return (
    <div className="p-4 space-y-6 bg-slate-50 min-h-screen">
      {activeBatches.map(batch => (
        <div key={batch.id} className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black text-slate-800"><Hash size={12}/>{batch.batch_id}</span>
                <button 
                  onClick={() => setActiveModal({ type: 'MATERIAL', data: batch })} 
                  className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase"
                >
                  Nạp vật tư
                </button>
              </div>
              <span className="text-[9px] text-slate-400 font-bold uppercase">{batch.sku}</span>
            </div>
            <div className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full uppercase italic">Đang sản xuất</div>
          </div>

          <div className="p-6 flex gap-8 overflow-x-auto scrollbar-hide">
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
      ))}

      {/* RENDER MODAL QC */}
      {activeModal.type === 'QC' && (
        <QCModal 
          batch={activeModal.data.batch} 
          step={activeModal.data.step} 
          onClose={() => setActiveModal({ type: null, data: null })} 
          onSuccess={() => fetchData(false)} 
        />
      )}

      {/* RENDER MODAL VẬT TƯ */}
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