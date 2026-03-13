"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Package, Truck, Loader2, Check, AlertCircle, 
  ShoppingCart, Layers, ArrowRight 
} from 'lucide-react';

export default function CombinedExportManager({ onSuccess }: { onSuccess?: () => void }) {
  const [viewMode, setViewMode] = useState<'order' | 'batch'>('order');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);

  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [exportQty, setExportQty] = useState<number>(0);
  const [customer, setCustomer] = useState('');

  const loadAllData = useCallback(async () => {
    setLoading(true);
    const [ordersRes, batchesRes] = await Promise.all([
      supabase.from('orders').select('*').neq('status', 'Hoàn tất').order('deadline', { ascending: true }),
      supabase.from('batch_records').select('*').eq('qc_status', 'Passed').gt('available_qty', 0).order('created_at', { ascending: false })
    ]);
    setOrders(ordersRes.data || []);
    setBatches(batchesRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const handleSelectOrder = async (order: any) => {
    setSelectedOrder(order);
    const { data } = await supabase.rpc('get_order_fulfillment_status', { target_order_id: order.id });
    setOrderItems(data || []);
  };

  // --- LOGIC XUẤT THEO ĐƠN HÀNG (SỬA LỖI TẠI ĐÂY) ---
  const handleOrderExport = async () => {
    if (!selectedOrder) return;
    if (!window.confirm(`Xác nhận xuất kho cho đơn hàng ${selectedOrder.order_number}?`)) return;

    setSubmitting(true);
    try {
      for (const item of orderItems) {
        const { data: batchList } = await supabase
          .from('batch_records')
          .select('*')
          .eq('sku', item.sku)
          .eq('qc_status', 'Passed')
          .gt('available_qty', 0)
          .order('created_at', { ascending: true }); // FIFO

        let needed = Number(item.required_qty);
        if (batchList) {
          for (const b of batchList) {
            if (needed <= 0) break;
            const ship = Math.min(Number(b.available_qty), needed);
            
            // Ép kiểu Number để tránh lỗi 400 và sai số decimal
            const { error } = await supabase.from('delivery_records').insert([{
              batch_id: b.id,
              customer_name: selectedOrder.customer,
              quantity_shipped: Number(ship.toFixed(5)),
              notes: `Xuất tự động theo đơn: ${selectedOrder.order_number}`
            }]);
            
            if (error) throw error;
            needed -= ship;
          }
        }
      }
      
      // Cập nhật trạng thái đơn hàng
      await supabase.from('orders').update({ status: 'Hoàn tất' }).eq('id', selectedOrder.id);
      
      alert("🎉 Đã hoàn tất xuất kho đơn hàng!");
      setSelectedOrder(null);
      if (onSuccess) onSuccess();
      loadAllData();
    } catch (err: any) { 
      alert("Lỗi: " + (err.details || err.message)); 
    } finally {
      setSubmitting(false);
    }
  };

  // --- LOGIC XUẤT LẺ ---
  const handleBatchExport = async () => {
    const qty = Number(parseFloat(exportQty.toString()).toFixed(5));
    const stock = Number(selectedBatch?.available_qty || 0);

    if (!selectedBatch || qty <= 0 || qty > stock || !customer.trim()) {
        alert("Thông tin không hợp lệ");
        return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('delivery_records').insert([{
        batch_id: selectedBatch.id,
        customer_name: customer.trim(),
        quantity_shipped: qty,
        notes: `Xuất lẻ lô: ${selectedBatch.batch_number}`
      }]);
      if (error) throw error;
      alert("🎉 Xuất lô thành công!");
      setSelectedBatch(null); setCustomer(''); setExportQty(0);
      if (onSuccess) onSuccess(); loadAllData();
    } catch (err: any) { alert("Lỗi: " + err.message); } 
    finally { setSubmitting(false); }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-6 rounded-[3rem]">
      {/* Tab Switcher */}
      <div className="flex gap-2 mb-8 bg-white p-2 rounded-2xl w-fit shadow-sm border border-slate-200">
        <button onClick={() => setViewMode('order')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${viewMode === 'order' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
          <ShoppingCart size={16} /> Xuất theo Đơn
        </button>
        <button onClick={() => setViewMode('batch')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${viewMode === 'batch' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
          <Layers size={16} /> Xuất lẻ theo Lô
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            {viewMode === 'order' ? orders.map(o => (
                <div key={o.id} onClick={() => handleSelectOrder(o)} className={`p-5 rounded-3xl border-2 transition-all cursor-pointer ${selectedOrder?.id === o.id ? 'border-blue-500 bg-blue-50' : 'bg-white border-transparent shadow-sm'}`}>
                  <p className="font-black text-blue-600 text-[10px]">#{o.order_number}</p>
                  <p className="font-bold text-slate-800 text-sm truncate">{o.customer}</p>
                </div>
            )) : batches.map(b => (
                <div key={b.id} onClick={() => { setSelectedBatch(b); setExportQty(Number(b.available_qty)); }} className={`p-5 rounded-3xl border-2 transition-all cursor-pointer ${selectedBatch?.id === b.id ? 'border-blue-500 bg-blue-50' : 'bg-white border-transparent shadow-sm'}`}>
                  <p className="font-black text-slate-400 text-[10px]">LOT: {b.batch_number}</p>
                  <p className="font-bold text-slate-800 text-sm">{b.sku}</p>
                  <p className="text-xl font-black text-blue-600">{Number(b.available_qty).toLocaleString()}</p>
                </div>
            ))}
          </div>
        </div>

        {/* Right Column (Xử lý Đơn / Lô) */}
        <div className="lg:col-span-8">
          {viewMode === 'order' && selectedOrder ? (
            <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
              <h2 className="text-3xl font-black text-slate-800 uppercase italic mb-8">Chi tiết đơn hàng</h2>
              
              <div className="space-y-4 mb-10">
                {orderItems.map((item, i) => {
                  // Logic so sánh chính xác để hiển thị trạng thái
                  const isEnough = Number(item.available_qty) >= Number(item.required_qty);
                  return (
                    <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-200">
                      <div>
                        <p className="font-black text-slate-700">{item.sku}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Cần: {Number(item.required_qty).toLocaleString()}</p>
                      </div>
                      <div className={`flex items-center gap-2 font-black ${isEnough ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isEnough ? <Check size={16}/> : <AlertCircle size={16}/>}
                        {Number(item.available_qty).toLocaleString()} khả dụng
                      </div>
                    </div>
                  );
                })}
              </div>

              <button 
                // ĐIỀU KIỆN QUAN TRỌNG: Chỉ bật nút khi tất cả các món đều đủ hàng
                disabled={submitting || orderItems.length === 0 || orderItems.some(i => Number(i.available_qty) < Number(i.required_qty))}
                onClick={handleOrderExport}
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] hover:bg-blue-600 transition-all shadow-xl disabled:opacity-30 disabled:grayscale"
              >
                {submitting ? <Loader2 className="animate-spin mx-auto"/> : "Xác nhận xuất đủ đơn hàng"}
              </button>
            </div>
          ) : viewMode === 'batch' && selectedBatch ? (
            /* Phần Xuất lẻ giữ nguyên như cũ */
            <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
              <h2 className="text-3xl font-black text-slate-800 uppercase italic mb-8">Xuất lẻ lô hàng</h2>
              {/* ... nội dung batch ... */}
              <div className="space-y-6">
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                   <p className="text-xl font-black text-blue-700">{selectedBatch.sku}</p>
                   <p className="text-xs font-bold text-blue-500">Tồn: {Number(selectedBatch.available_qty).toLocaleString()}</p>
                </div>
                <input type="number" value={exportQty} onChange={e => setExportQty(Number(e.target.value))} className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-black text-2xl text-blue-600" />
                <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Khách hàng..." className="w-full p-5 bg-slate-50 border-2 rounded-2xl" />
                <button disabled={submitting || exportQty <= 0 || exportQty > selectedBatch.available_qty || !customer} onClick={handleBatchExport} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase shadow-xl disabled:opacity-50">
                   Xác nhận xuất kho
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[4rem] text-slate-200">
              <Package size={80} strokeWidth={1} className="mb-4" />
              <p className="font-black uppercase tracking-[0.5em] text-xs text-center">Chọn một đơn hàng hoặc lô hàng <br/> từ cột bên trái để bắt đầu</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}