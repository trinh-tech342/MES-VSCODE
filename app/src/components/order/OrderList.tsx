"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, Loader2, Hash, User, ArrowRight } from 'lucide-react';

export default function OrderList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('WAITING');

  // --- 1. HÀM LẤY DỮ LIỆU BAN ĐẦU ---
  const fetchOrderItems = useCallback(async () => {
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

  // --- 2. THIẾT LẬP REALTIME TỐI ƯU ---
  useEffect(() => {
    fetchOrderItems(); 

    const channel = supabase
      .channel('order-items-realtime')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'order_items' }, 
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            // Cập nhật cục bộ: Giữ dữ liệu quan hệ (orders) và đè dữ liệu mới
            setItems(prev => prev.map(item => 
              item.id === payload.new.id 
                ? { ...item, ...payload.new } 
                : item
            ));
          } else {
            fetchOrderItems();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrderItems]);

  // --- 3. LOGIC DUYỆT SẢN XUẤT (SỬ DỤNG RPC) ---
  const approveItemProduction = async (item: any) => {
    // Chặn ngay lập tức nếu đang xử lý hoặc đơn đã đổi trạng thái
    if (processingId || getStatusType(item.status) !== 'WAITING') return;
    
    if (!window.confirm(`Xác nhận duyệt SKU: ${item.sku}?`)) return;
    
    setProcessingId(item.id);

    try {
      // BƯỚC 1: Lấy quy trình từ bảng product_process
      const { data: processData, error: processError } = await supabase
        .from('product_process')
        .select('steps')
        .eq('sku', item.sku)
        .single();

      if (processError || !processData) throw new Error(`SKU ${item.sku} chưa có quy trình!`);

      // BƯỚC 2: Gọi Database Function (RPC) - Xử lý tất cả các bảng trong 1 Transaction
      const { error: rpcError } = await supabase.rpc('approve_production_v1', {
        p_item_id: item.id,
        p_sku: item.sku,
        p_order_id: item.order_id,
        p_quantity: item.quantity,
        p_steps: processData.steps 
      });

      if (rpcError) {
        // Kiểm tra lỗi tùy chỉnh từ SQL (nếu đơn đã được duyệt trước đó)
        if (rpcError.message.includes('already in production')) {
          throw new Error("Đơn hàng này đã được người khác duyệt rồi!");
        }
        throw rpcError;
      }

      // THÀNH CÔNG: UI sẽ tự cập nhật nhờ Realtime Update ở bước 2
    } catch (error: any) {
      alert("Thông báo: " + error.message);
      fetchOrderItems(); // Đồng bộ lại danh sách để chắc chắn dữ liệu khớp
    } finally {
      setProcessingId(null);
    }
  };

  // --- 4. HELPER PHÂN LOẠI TRẠNG THÁI ---
  const getStatusType = (rawStatus: string) => {
    const s = (rawStatus || '').toUpperCase();
    if (s.includes('CHỜ') || s === 'WAITING' || s === '') return 'WAITING';
    if (s.includes('ĐANG') || s === 'RUNNING' || s === 'IN_PROGRESS') return 'RUNNING';
    if (s.includes('HOÀN THÀNH') || s === 'FINISHED' || s === 'COMPLETED') return 'COMPLETED';
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
            { id: 'COMPLETED', label: 'Hoàn thành' },
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
              const isProcessing = processingId === item.id;

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
                      statusType === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      {item.status || 'Chờ duyệt'}
                    </span>
                  </td>

                  <td className="p-5 text-right">
                    {statusType === 'WAITING' ? (
                      <button 
                        onClick={() => approveItemProduction(item)}
                        disabled={isProcessing || !!processingId}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black hover:bg-blue-700 uppercase flex items-center gap-2 ml-auto shadow-lg shadow-blue-100 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                      >
                        {isProcessing ? <Loader2 size={12} className="animate-spin"/> : 'Duyệt sản xuất'}
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
      </div>
    </div>
  );
}