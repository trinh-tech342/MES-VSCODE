"use client";
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  AlertCircle, Truck, CalendarClock, ChevronRight, 
  ChevronDown, ChevronUp, Bell, Factory, ShoppingCart, 
  Loader2, CheckCircle2, Undo2 
} from 'lucide-react';

interface EarlyWarningProps {
  data: any[];
  onSuccess?: () => void;
  onPurchase?: (item: any) => void; 
  onProduction?: (item: any) => void;
}

export default function EarlyWarningSystem({ 
  data, 
  onSuccess, 
  onPurchase, 
  onProduction 
}: EarlyWarningProps) {
  // States quản lý hiển thị
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);
  
  // States quản lý dữ liệu phiên làm việc
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processedIds, setProcessedIds] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // Lọc các mặt hàng khẩn cấp
  const urgentItems = data
    .filter(item => item.daysUntilOrder <= 3 && !processedIds.includes(item.id))
    .sort((a, b) => a.daysUntilOrder - b.daysUntilOrder);

  const prodCount = urgentItems.filter(i => i.category?.toLowerCase().includes('thành phẩm')).length;
  const purchaseCount = urgentItems.length - prodCount;

  // --- HÀM HELPER GHI LOG VÀO BẢNG HÀNH ĐỘNG ---
  const logAction = async (sku: string, type: 'PROD' | 'PURCHASE') => {
    const { error } = await supabase
      .from('supply_chain_actions')
      .insert([
        { 
          sku: sku, 
          action_type: type,
          resolved_date: new Date().toISOString().split('T')[0] 
        }
      ]);
    if (error) console.error("Lỗi lưu lịch sử hành động vào DB:", error);
  };

  // 1. XỬ LÝ SẢN XUẤT
  const handleProductionClick = async (item: any) => {
    if (onProduction) {
      // Trường hợp có file cha xử lý (Modal/Tabs)
      onProduction(item);
      await logAction(item.id, 'PROD'); // Ghi log vào DB ngay
      setProcessedIds(prev => [...prev, item.id]);
      setHistory(prev => [{ ...item, type: 'PROD', finalQty: 'Đang lập lệnh' }, ...prev]);
      if (onSuccess) onSuccess(); 
    } else {
      // Trường hợp chạy trực tiếp RPC
      if (processingId) return;
      const suggestQty = Math.max(0, (item.min_stock || 0) - (item.qty || 0));
      const finalQty = suggestQty > 0 ? suggestQty : 10; 
      if (!window.confirm(`Xác nhận lập lệnh sản xuất cho SKU: ${item.id}?`)) return;

      setProcessingId(item.id);
      try {
        const { data: processData, error: processError } = await supabase
          .from('product_process').select('steps').eq('sku', item.id).single();

        if (processError || !processData) throw new Error(`SKU ${item.id} chưa có quy trình!`);

        const { error: rpcError } = await supabase.rpc('approve_production_v1', {
          p_item_id: null, p_sku: item.id, p_order_id: null, p_quantity: finalQty, p_steps: processData.steps 
        });

        if (rpcError) throw rpcError;

        // Ghi nhận vào bảng hành động sau khi RPC thành công
        await logAction(item.id, 'PROD');

        setProcessedIds(prev => [...prev, item.id]);
        setHistory(prev => [{ ...item, finalQty, type: 'PROD' }, ...prev]);
        if (onSuccess) onSuccess(); 
      } catch (error: any) {
        alert("❌ Lỗi: " + error.message);
      } finally {
        setProcessingId(null);
      }
    }
  };

  // 2. XỬ LÝ THU MUA
  const handlePurchaseClick = async (item: any) => {
    if (onPurchase) {
      onPurchase(item);
      
      // Ghi nhận vào bảng hành động
      await logAction(item.id, 'PURCHASE');

      setProcessedIds(prev => [...prev, item.id]);
      const suggestQty = Math.max(0, (item.min_stock || 0) - (item.qty || 0));
      setHistory(prev => [{ ...item, finalQty: suggestQty || 'Theo định mức', type: 'PURCHASE' }, ...prev]);
      if (onSuccess) onSuccess();
    }
  };

  // 3. HOÀN TÁC (Chỉ xóa ở UI phiên này, nếu muốn xóa ở DB cần thêm logic xóa record ở bảng actions)
  const handleUndo = (itemId: string) => {
    setProcessedIds(prev => prev.filter(id => id !== itemId));
    setHistory(prev => prev.filter(item => item.id !== itemId));
  };

  if (urgentItems.length === 0 && history.length === 0) return null;

  return (
    <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
      {/* HEADER TRUNG TÂM */}
      <div 
        className={`flex items-center justify-between p-5 rounded-[2.5rem] cursor-pointer transition-all duration-500 border-2 ${
          isCollapsed ? 'bg-amber-50 border-amber-100 shadow-md' : 'bg-white border-slate-100 shadow-sm'
        }`}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl transition-all ${
            isCollapsed ? 'bg-amber-500 text-white shadow-lg' : 'bg-amber-100 text-amber-600'
          }`}>
            <Bell size={24} className={isCollapsed ? 'animate-bounce' : ''} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase italic tracking-wider text-slate-800 flex items-center gap-2">
              Trung tâm điều phối cung ứng
              <span className="bg-rose-500 text-white text-[10px] not-italic px-2 py-0.5 rounded-full">{urgentItems.length}</span>
            </h3>
            {isCollapsed && (
              <p className="text-[10px] text-amber-600 font-bold uppercase mt-1 flex gap-3 animate-pulse">
                <span>• {prodCount} Sản xuất</span>
                <span>• {purchaseCount} Thu mua</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span className="text-[10px] font-black uppercase hidden md:block">{isCollapsed ? 'Mở rộng' : 'Thu gọn'}</span>
          {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* GRID CÁC THẺ CẢNH BÁO */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6 animate-in zoom-in-95 duration-300">
            {urgentItems.map((item) => {
              const isFinishedProduct = item.category?.toLowerCase().includes('thành phẩm');
              return (
                <div key={item.id} className="group relative overflow-hidden bg-white border-2 border-slate-100 rounded-[2.2rem] p-6 hover:shadow-2xl transition-all hover:border-blue-100">
                  <div className="relative z-10">
                    <div className="flex flex-col gap-1.5 mb-4">
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 w-fit">SKU: {item.id}</span>
                      <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase ${isFinishedProduct ? 'text-emerald-500' : 'text-orange-500'}`}>
                        {isFinishedProduct ? <Factory size={12}/> : <ShoppingCart size={12}/>}
                        {isFinishedProduct ? 'Sản xuất nội bộ' : 'Mua hàng bên ngoài'}
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-800 text-base mb-4 line-clamp-1 italic">{item.name}</h4>

                    <div className="flex items-center gap-3 py-3 px-4 border rounded-2xl bg-slate-50 border-slate-100">
                      <CalendarClock size={16} className="text-slate-400" />
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-400 uppercase font-black">Hạn xử lý</span>
                        <span className="text-[10px] font-black text-slate-700">Còn {item.daysUntilOrder} ngày</span>
                      </div>
                    </div>

                    {isFinishedProduct ? (
                      <button 
                        onClick={() => handleProductionClick(item)}
                        disabled={processingId === item.id}
                        className="w-full mt-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg"
                      >
                        {processingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Factory size={14} />}
                        Lập lệnh sản xuất
                      </button>
                    ) : (
                      <button 
                        onClick={() => handlePurchaseClick(item)}
                        className="w-full mt-6 py-4 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg"
                      >
                        <ShoppingCart size={14} /> Lập lệnh thu mua
                      </button>
                    )}
                  </div>
                  {isFinishedProduct ? (
                    <Factory className="absolute -right-4 -bottom-4 text-slate-50 opacity-50 group-hover:text-emerald-50 transition-colors" size={80} />
                  ) : (
                    <Truck className="absolute -right-4 -bottom-4 text-slate-50 opacity-50 group-hover:text-blue-50 transition-colors" size={80} />
                  )}
                </div>
              );
            })}
          </div>

          {/* PHẦN LỊCH SỬ */}
          {history.length > 0 && (
            <div className="mt-10 border-t-2 border-dashed border-slate-200 pt-6">
              <div 
                className="flex items-center justify-between mb-4 cursor-pointer group"
                onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
              >
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group-hover:text-slate-600">
                  <CheckCircle2 size={14} className="text-emerald-500" /> 
                  Vừa xử lý trong phiên này ({history.length})
                </h4>
                <div className="flex items-center gap-2 text-slate-400 text-[9px] font-bold uppercase">
                  {isHistoryCollapsed ? 'Xem chi tiết' : 'Ẩn bớt'}
                  {isHistoryCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </div>
              </div>

              {!isHistoryCollapsed && (
                <div className="flex flex-col gap-2 animate-in slide-in-from-top-2">
                  {history.map((hItem) => (
                    <div key={hItem.id} className="flex items-center justify-between bg-white px-6 py-3 rounded-3xl border border-slate-100 group/item hover:border-blue-200 shadow-sm transition-all">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-50 rounded-xl">
                          {hItem.type === 'PROD' ? <Factory size={14} className="text-emerald-500"/> : <ShoppingCart size={14} className="text-blue-500"/>}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-700">{hItem.id}</span>
                          <span className="text-[10px] text-slate-400 italic line-clamp-1">{hItem.name}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleUndo(hItem.id)} 
                        className="text-[9px] font-black uppercase text-slate-400 hover:text-rose-500 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all"
                      >
                        <Undo2 size={12} /> Hoàn tác
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}