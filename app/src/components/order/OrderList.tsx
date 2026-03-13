"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, Loader2, Hash, User, ArrowRight } from 'lucide-react';

export default function OrderList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('WAITING');

  // --- 1. HÀM LẤY DỮ LIỆU (Dùng useCallback để ổn định dependency) ---
  const fetchOrderItems = useCallback(async () => {
    // Chỉ hiện loading xoay ở lần đầu, các lần realtime sau sẽ cập nhật ngầm cho mượt
    try {
      const { data, error } = await supabase
        .from('order_items') 
        .select(`
          *,
          orders (
            order_number,
            customer
          )
        `) 
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted = data.map(item => ({
          ...item,
          display_order_code: item.orders?.order_number || (item.order_id?.slice(0, 8)),
          display_customer: item.orders?.customer || "Khách hàng lẻ"
        }));
        setItems(formatted);
      }
    } catch (err: any) {
      console.error("Lỗi hệ thống:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- 2. THIẾT LẬP REALTIME ---
  useEffect(() => {
    fetchOrderItems(); // Lấy dữ liệu lần đầu

    const channel = supabase
      .channel('order-items-realtime')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'order_items' }, 
        (payload) => {
          console.log("Phát hiện thay đổi đơn hàng:", payload);
          fetchOrderItems(); // Tự động cập nhật lại danh sách
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrderItems]);

  // --- 3. LOGIC DUYỆT SẢN XUẤT ---
  const approveItemProduction = async (item: any) => {
    if (!window.confirm(`Xác nhận duyệt SKU: ${item.sku}?`)) return;
    setProcessingId(item.id);

    try {
      const { data: processData, error: processError } = await supabase
        .from('product_process')
        .select('steps')
        .eq('sku', item.sku)
        .single();

      if (processError || !processData) throw new Error(`SKU ${item.sku} chưa có quy trình!`);

      const newBatchId = `BT-${item.sku}-${Date.now().toString().slice(-4)}`;

      // Cập nhật trạng thái item
      const { error: updateError } = await supabase
        .from('order_items')
        .update({ status: 'Đang sản xuất' })
        .eq('id', item.id);
      
      if (updateError) throw updateError;

      // Tạo Lô sản xuất (Batch)
      await supabase.from('batches').insert([{
        batch_id: newBatchId,
        sku: item.sku,
        order_id: item.order_id,
        order_item_id: item.id,
        planned_qty: item.quantity,
        status: 'RUNNING',
        start_time: new Date().toISOString()
      }]);

      // Tạo các công đoạn (Steps)
      const stepsToInsert = processData.steps.map((name: string, index: number) => ({
        batch_id: newBatchId,
        step_name: name,
        status: 'PENDING',
        sort_order: index,
        operator_name: 'Hệ thống'
      }));

      await supabase.from('production_steps').insert(stepsToInsert);
      
      // Không cần fetchOrderItems() ở đây nữa vì Realtime sẽ tự bắt được event Update phía trên
    } catch (error: any) {
      alert("Lỗi: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusType = (rawStatus: string) => {
    const s = (rawStatus || '').toUpperCase();
    if (s.includes('CHỜ') || s === 'WAITING' || s === '') return 'WAITING';
    if (s.includes('ĐANG') || s === 'RUNNING' || s === 'IN_PROGRESS') return 'RUNNING';
    if (s.includes('HOÀN THÀNH') || s === 'FINISHED' || s === 'COMPLETED') return 'FINISHED';
    return 'OTHER';
  };

  const filteredItems = items.filter(item => {
    const type = getStatusType(item.status);
    if (filter === 'ALL') return true;
    return type === filter;
  });

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Đang tải danh sách điều phối...</p>
    </div>
  );

  return (
    <div className="mt-8 bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
        <h3 className="font-black text-slate-800 text-lg flex items-center gap-2 uppercase tracking-tighter">
          <Clock size={22} className="text-blue-600" /> Điều phối sản xuất
        </h3>
        
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          {[
            { id: 'WAITING', label: 'Chờ duyệt' },
            { id: 'RUNNING', label: 'Sản xuất' },
            { id: 'FINISHED', label: 'Hoàn thành' },
            { id: 'ALL', label: 'Tất cả' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                filter === tab.id ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] uppercase text-slate-400 font-black border-b border-slate-100 bg-slate-50/30">
              <th className="p-5">Mã đơn / Khách</th>
              <th className="p-5">Sản phẩm (SKU)</th>
              <th className="p-5 text-center">Số lượng</th>
              <th className="p-5 text-center">Trạng thái</th>
              <th className="p-5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map((item) => {
              const statusType = getStatusType(item.status);
              return (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-all group">
                  <td className="p-5">
                    <div className="flex items-center gap-2 text-blue-700 font-black text-sm">
                      <Hash size={14} className="text-blue-400"/> {item.display_order_code}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold mt-1">
                      <User size={12} className="text-slate-400"/> {item.display_customer}
                    </div>
                  </td>

                  <td className="p-5">
                    <div className="font-black text-slate-800 group-hover:text-blue-600 transition-colors uppercase">{item.sku}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-medium line-clamp-1">{item.product_name || 'Sản phẩm chưa đặt tên'}</div>
                  </td>

                  <td className="p-5 text-center font-black text-slate-700 text-sm">
                    {item.quantity?.toLocaleString()}
                  </td>

                  <td className="p-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                      statusType === 'RUNNING' ? 'bg-orange-50 text-orange-600 border-orange-100 animate-pulse' : 
                      statusType === 'FINISHED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      {item.status || 'Chờ duyệt'}
                    </span>
                  </td>

                  <td className="p-5 text-right">
                    {statusType === 'WAITING' ? (
                      <button 
                        onClick={() => approveItemProduction(item)}
                        disabled={processingId === item.id}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black hover:bg-blue-700 uppercase flex items-center gap-2 ml-auto shadow-lg shadow-blue-100 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {processingId === item.id ? <Loader2 size={12} className="animate-spin"/> : 'Duyệt sản xuất'}
                      </button>
                    ) : (
                      <div className="flex justify-end items-center gap-1 text-[10px] font-bold text-slate-300 italic uppercase">
                        Đã điều phối <ArrowRight size={12}/>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredItems.length === 0 && (
          <div className="p-20 text-center">
            <p className="text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">
              Không có đơn hàng nào trong mục này
            </p>
          </div>
        )}
      </div>
    </div>
  );
}