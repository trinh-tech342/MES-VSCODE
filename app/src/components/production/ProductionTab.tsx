"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

import StatCard from './StatCard';
import BatchItem from './BatchItem';
import BatchDetailModal from './BatchDetailModal'; 
import { BarChart3, Layers, AlertTriangle, Box, TrendingUp, Loader2, CheckCircle2 } from 'lucide-react';

export default function ManagerDashboard() {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, running: 0, delayed: 0 });
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const fetchManagerData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('view_manager_production')
        .select(`
          *, 
          production_steps (*), 
          batch_material_usage (
            actual_quantity, 
            material_lots (material_name, unit)
          )
        `)
        .neq('status', 'Completed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Lỗi Supabase:", error.message);
        return;
      }

      if (data) {
        setBatches(data);
        const delayedCount = data.filter(b => {
          const activeStep = b.production_steps?.find((s: any) => s.status === 'RUNNING');
          return activeStep?.start_time && (new Date().getTime() - new Date(activeStep.start_time).getTime()) / (1000 * 60 * 60) > 4;
        }).length;
        setStats({ total: data.length, running: data.length, delayed: delayedCount });
      }
    } catch (err) {
      console.error("Lỗi hệ thống:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagerData();
    const sub = supabase.channel('manager-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, () => fetchManagerData())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [fetchManagerData]);

  const handleInboundToStorage = async (batch: any) => {
    if (!confirm(`Xác nhận nhập kho lô ${batch.batch_id}?`)) return;
    setIsProcessing(batch.id);
    const { error } = await supabase.from('batches').update({ status: 'Completed' }).eq('id', batch.id);
    if (error) alert(error.message);
    setIsProcessing(null);
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
      <span className="font-black text-slate-400 uppercase tracking-widest animate-pulse">Đang tải...</span>
    </div>
  );

  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard title="Đang sản xuất" value={stats.total} icon={<Layers size={20}/>} color="blue" />
        <StatCard title="Cảnh báo chậm" value={stats.delayed} icon={<AlertTriangle size={20}/>} color="red" />
        <StatCard title="Tổng sản lượng" value={batches.reduce((a, b) => a + (b.planned_qty || 0), 0).toLocaleString()} icon={<Box size={20}/>} color="emerald" />
        <StatCard title="Hiệu suất xưởng" value="94%" icon={<TrendingUp size={20}/>} color="orange" />
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
            <BarChart3 size={28} className="text-indigo-600" /> Tiến độ thời gian thực
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {batches.length > 0 ? (
            batches.map(batch => (
              <BatchItem 
                key={batch.id} 
                batch={batch} 
                onSelect={setSelectedBatch} 
                onInbound={handleInboundToStorage}
                isProcessing={isProcessing === batch.id}
              />
            ))
          ) : (
            <div className="bg-white p-12 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
               <CheckCircle2 size={48} className="mb-4 opacity-20" />
               <p className="font-bold uppercase tracking-widest text-sm">Xưởng đang trống lô sản xuất</p>
            </div>
          )}
        </div>
      </div>

      <BatchDetailModal batch={selectedBatch} onClose={() => setSelectedBatch(null)} />
    </div>
  );
}