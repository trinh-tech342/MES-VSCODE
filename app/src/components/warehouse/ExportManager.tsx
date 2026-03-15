"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Package, Truck, Loader2, Check, AlertCircle, 
  ShoppingCart, Layers, ArrowRight 
} from 'lucide-react';

export default function CombinedExportManager({ onSuccess }: { onSuccess?: () => void }) {
  // --- STATES ---
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

  // --- DATA LOADING ---
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, batchesRes] = await Promise.all([
        supabase.from('orders')
          .select('*')
          .neq('status', 'COMPLETED')
          .order('deadline', { ascending: true }),
        
        supabase.from('batch_records')
          .select(`
            *,
            products (
              product_name,
              unit
            )
          `)
          .eq('qc_status', 'Passed')
          .gt('available_qty', 0)
          .order('created_at', { ascending: false })
      ]);
      
      setOrders(ordersRes.data || []);
      setBatches(batchesRes.data || []);
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  // --- HANDLERS ---
// TRONG FILE REACT CỦA BẠN
const handleSelectOrder = async (order: any) => {
  setSelectedOrder(order);
  setOrderItems([]); 
  
  const { data, error } = await supabase.rpc('get_order_fulfillment_status', { 
    target_order_id: order.id 
  });

  if (error) {
    console.error("Lỗi:", error);
    return;
  }
  
  // Log ra để chắc chắn data đã về
  console.log("Sản phẩm trong đơn:", data); 
  setOrderItems(data || []);
};

  const handleOrderExport = async () => {
    if (!selectedOrder || orderItems.length === 0) return;
    
    // Kiểm tra tồn kho trước khi thực hiện
    const isAllStockAvailable = orderItems.every(
      i => Number(i.available_qty) >= Number(i.required_qty)
    );
    if (!isAllStockAvailable) {
      alert("Kho không đủ số lượng để xuất đơn hàng này!");
      return;
    }

    if (!window.confirm(`Xác nhận xuất kho và hoàn tất đơn hàng ${selectedOrder.order_number}?`)) return;

    setSubmitting(true);
    try {
      // BƯỚC 1: Xử lý xuất kho cho từng Item
      for (const item of orderItems) {
        // Tìm các lô hàng có sẵn (FIFO)
        const { data: batchList } = await supabase
          .from('batch_records')
          .select('id, available_qty')
          .eq('sku', item.sku)
          .eq('qc_status', 'Passed')
          .gt('available_qty', 0)
          .order('created_at', { ascending: true });

        let needed = Number(item.required_qty);
        if (batchList) {
          for (const b of batchList) {
            if (needed <= 0) break;
            const ship = Math.min(Number(b.available_qty), needed);
            
            // Insert vào delivery_records (Database trigger sẽ tự trừ tồn kho ở batch_records)
            const { error: delErr } = await supabase.from('delivery_records').insert([{
              batch_id: b.id,
              customer_name: selectedOrder.customer,
              quantity_shipped: Number(ship.toFixed(5)),
              notes: `Xuất theo đơn: ${selectedOrder.order_number}`
            }]);
            
            if (delErr) throw delErr;
            needed -= ship;
          }
        }

        // BƯỚC 2: Cập nhật status trong order_items thành 'COMPLETED'
        // Trigger trg_sync_order_status sẽ tự động cập nhật bảng orders cho bạn
        const { error: itemUpdateErr } = await supabase
          .from('order_items')
          .update({ status: 'COMPLETED' })
          .match({ order_id: selectedOrder.id, sku: item.sku });
        
        if (itemUpdateErr) throw itemUpdateErr;
      }
      
      alert("🎉 Xuất kho thành công! Trạng thái đơn hàng đã được cập nhật.");
      
      // Reset & Refresh
      setSelectedOrder(null);
      setOrderItems([]);
      if (onSuccess) onSuccess();
      loadAllData();

    } catch (err: any) { 
      alert("Lỗi quá trình xuất: " + (err.message || "Unknown error")); 
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchExport = async () => {
    const qty = Number(parseFloat(exportQty.toString()).toFixed(5));
    const stock = Number(selectedBatch?.available_qty || 0);

    if (!selectedBatch || qty <= 0 || qty > stock || !customer.trim()) {
        alert("Thông tin không hợp lệ hoặc vượt quá tồn kho");
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
      
      alert("🎉 Xuất lẻ lô thành công!");
      setSelectedBatch(null); 
      setCustomer(''); 
      setExportQty(0);
      if (onSuccess) onSuccess(); 
      loadAllData();
    } catch (err: any) { 
      alert("Lỗi: " + err.message); 
    } finally { 
      setSubmitting(false); 
    }
  };

  // --- RENDER HELPERS --- (Giữ nguyên giao diện đẹp của bạn)
  const renderOrderDetail = () => {
    const totalQtyToShip = orderItems.reduce((sum, item) => sum + Number(item.required_qty), 0);
    const totalItemsCount = orderItems.length;
    const isAllStockAvailable = orderItems.length > 0 && orderItems.every(i => Number(i.available_qty) >= Number(i.required_qty));

    return (
      <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <p className="text-blue-600 font-black text-sm uppercase tracking-widest">Đang xử lý đơn hàng</p>
            <h2 className="text-3xl font-black text-slate-800 uppercase italic">#{selectedOrder.order_number}</h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Khách hàng</p>
            <p className="font-bold text-slate-700">{selectedOrder.customer || 'N/A'}</p>
          </div>
        </div>
        
        <div className="space-y-4 mb-8">
          {orderItems.length > 0 ? (
            orderItems.map((item, i) => {
              const isEnough = Number(item.available_qty) >= Number(item.required_qty);
              return (
                <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm transition-all hover:bg-white group">
                  <div className="max-w-[60%]">
                    <p className="font-black text-slate-700 leading-tight group-hover:text-blue-600 transition-colors">
                      {item.product_name || item.sku}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                      SKU: {item.sku} | Cần xuất: <span className="text-slate-900">{Number(item.required_qty).toLocaleString()} {item.unit}</span>
                    </p>
                  </div>
                  <div className={`flex items-center gap-2 font-black text-sm ${isEnough ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isEnough ? <Check size={16} strokeWidth={3} /> : <AlertCircle size={16} strokeWidth={3} />}
                    <div className="text-right">
                      <p className="leading-none">{Number(item.available_qty).toLocaleString()} {item.unit}</p>
                      <p className="text-[8px] uppercase opacity-60">khả dụng</p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-slate-400 font-bold italic border-2 border-dashed rounded-[2rem] bg-slate-50/50">
                <Loader2 className="animate-spin mx-auto mb-3 opacity-30" size={32} />
                <p className="text-sm uppercase tracking-widest">Đang kiểm tra tồn kho...</p>
            </div>
          )}
        </div>

        {orderItems.length > 0 && (
          <>
            <div className="mb-8 p-6 bg-slate-900 rounded-[2rem] text-white shadow-lg shadow-slate-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Package size={60} />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">Mặt hàng</span>
                  <span className="font-black text-xl">{totalItemsCount}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">Tổng khối lượng</span>
                  <span className="font-black text-3xl text-blue-400 tracking-tighter">
                    {totalQtyToShip.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <button 
              disabled={submitting || !isAllStockAvailable}
              onClick={handleOrderExport}
              className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-100 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {submitting ? <Loader2 className="animate-spin" /> : (
                <>
                  <Truck size={20} />
                  <span>Xác nhận xuất kho & Hoàn tất</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    );
  };

  const renderBatchDetail = () => (
    <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
      <h2 className="text-3xl font-black text-slate-800 uppercase italic mb-8">Xuất lẻ lô hàng</h2>
      <div className="space-y-6">
        <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
           <p className="text-xl font-black text-blue-700 mb-1">
             {selectedBatch.products?.product_name || "Chưa xác định tên"}
           </p>
           <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">
             LOT: {selectedBatch.batch_number} | SKU: {selectedBatch.sku}
           </p>
           <div className="mt-2 pt-2 border-t border-blue-200/50">
             <span className="text-[10px] font-bold text-blue-400 uppercase">Tồn kho khả dụng: </span>
             <span className="font-black text-blue-700">{Number(selectedBatch.available_qty).toLocaleString()} {selectedBatch.products?.unit}</span>
           </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase ml-4 mb-2">Số lượng xuất ({selectedBatch.products?.unit})</label>
            <input 
              type="number" 
              value={exportQty} 
              onChange={e => setExportQty(Number(e.target.value))} 
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl font-black text-2xl text-blue-600 transition-all" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase ml-4 mb-2">Tên khách hàng / Ghi chú</label>
            <input 
              value={customer} 
              onChange={e => setCustomer(e.target.value)} 
              placeholder="Nhập tên khách..." 
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl font-bold text-slate-700" 
            />
          </div>
        </div>

        <button 
          disabled={submitting || exportQty <= 0 || exportQty > selectedBatch.available_qty || !customer.trim()} 
          onClick={handleBatchExport} 
          className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
           {submitting ? <Loader2 className="animate-spin mx-auto"/> : "Xác nhận xuất kho lẻ"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen p-6 rounded-[3rem]">
      <div className="flex gap-2 mb-8 bg-white p-2 rounded-2xl w-fit shadow-sm border border-slate-200">
        <button onClick={() => { setViewMode('order'); setSelectedBatch(null); setSelectedOrder(null); setOrderItems([]); }} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${viewMode === 'order' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:bg-slate-50'}`}>
          <ShoppingCart size={16} /> Xuất theo Đơn
        </button>
        <button onClick={() => { setViewMode('batch'); setSelectedOrder(null); setSelectedBatch(null); setOrderItems([]); }} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${viewMode === 'batch' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:bg-slate-50'}`}>
          <Layers size={16} /> Xuất lẻ theo Lô
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-4">
          <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-10 text-slate-300">
                <Loader2 className="animate-spin mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Đang tải dữ liệu...</span>
              </div>
            ) : viewMode === 'order' ? (
              orders.length > 0 ? orders.map(o => (
                <div key={o.id} onClick={() => handleSelectOrder(o)} className={`p-5 rounded-3xl border-2 transition-all cursor-pointer ${selectedOrder?.id === o.id ? 'border-blue-500 bg-blue-50 shadow-md translate-x-1' : 'bg-white border-transparent shadow-sm hover:border-slate-200'}`}>
                  <p className="font-black text-blue-600 text-[10px] mb-1">#{o.order_number}</p>
                  <p className="font-bold text-slate-800 text-sm truncate">{o.customer}</p>
                </div>
              )) : <p className="p-10 text-center text-slate-400 italic">Không có đơn hàng chờ xuất</p>
            ) : (
              batches.length > 0 ? batches.map(b => (
                <div key={b.id} onClick={() => { setSelectedBatch(b); setExportQty(Number(b.available_qty)); }} className={`p-5 rounded-3xl border-2 transition-all cursor-pointer ${selectedBatch?.id === b.id ? 'border-blue-500 bg-blue-50 shadow-md translate-x-1' : 'bg-white border-transparent shadow-sm hover:border-slate-200'}`}>
                  <p className="font-black text-slate-400 text-[10px] mb-1">LOT: {b.batch_number}</p>
                  <p className="font-bold text-slate-800 text-sm leading-tight mb-2 uppercase italic">
                    {b.products?.product_name || b.sku}
                  </p>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-slate-400">SKU: {b.sku}</span>
                    <p className="text-xl font-black text-blue-600 leading-none">{Number(b.available_qty).toLocaleString()} {b.products?.unit}</p>
                  </div>
                </div>
              )) : <p className="p-10 text-center text-slate-400 italic">Kho không còn hàng khả dụng</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          {viewMode === 'order' && selectedOrder ? renderOrderDetail() : 
           viewMode === 'batch' && selectedBatch ? renderBatchDetail() : (
            <div className="h-full min-h-[450px] flex flex-col items-center justify-center border-4 border-dashed border-slate-200 rounded-[4rem] text-slate-300 bg-white/50">
              <Package size={80} strokeWidth={1} className="mb-6 opacity-20" />
              <p className="font-black uppercase tracking-[0.4em] text-[10px] text-center leading-loose">
                Chọn một đơn hàng hoặc lô hàng <br/> từ danh sách bên trái để tiếp tục
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}