"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Warehouse, Search, Plus, RefreshCw, Truck,
  Clock, ShoppingCart, Factory, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';

import { BulkImportModal } from './BulkImportModal';
import StatCard from './StatCard';
import QRCodeStation from './QRCodeStation';
import ExportManager from './ExportManager';

export default function WarehouseTab() {
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [bomList, setBomList] = useState<any[]>([]);
  const [expandedSKU, setExpandedSKU] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [reports, setReports] = useState({
    toPurchase: [] as any[],
    expiringSoon: [] as any[],
    toProduce: [] as any[]
  });

  /**
   * 1. HÀM LẤY DỮ LIỆU TỪ DATABASE
   * Đảm bảo View v_inventory_summary đã được GROUP BY theo SKU ở phía Database
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, lotsRes, catalogRes] = await Promise.all([
        supabase.from('v_inventory_summary').select('*'),
        supabase.from('material_lots')
          .select('*')
          .gt('remaining_quantity', 0)
          .order('exp_date', { ascending: true }),
        supabase.from('material_catalog').select('*')
      ]);

      if (summaryRes.error) throw summaryRes.error;
      if (lotsRes.error) throw lotsRes.error;

      const summary = summaryRes.data || [];
      const allLots = lotsRes.data || [];
      setBomList(catalogRes.data || []);

      // Khớp dữ liệu lô hàng lẻ vào từng SKU tổng (item.id là SKU)
      const stockList = summary.map(item => ({
        ...item,
        lots: allLots.filter(l => l.material_sku === item.id)
      }));

      setStock(stockList);

      // --- LOGIC TÍNH TOÁN BÁO CÁO NHANH ---
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      setReports({
        toPurchase: summary.filter(i => {
          const cat = (i.category || '').toLowerCase();
          const isSupply = cat.includes('nguyên liệu') || cat.includes('bao bì') || cat.includes('phụ gia');
          return isSupply && i.stock_status === 'LOW';
        }),
        expiringSoon: allLots.filter(l => {
          if (!l.exp_date) return false;
          const expDate = new Date(l.exp_date);
          return expDate <= thirtyDaysLater && expDate >= now;
        }).map(l => ({
          ...l,
          id: l.material_sku,
          name: l.material_name,
          lot_display: `Lô: ${l.lot_number} (Còn ${l.remaining_quantity} ${l.unit})`
        })),
        toProduce: summary.filter(i => {
          const cat = (i.category || '').toLowerCase();
          return cat.includes('thành phẩm') && i.stock_status === 'LOW';
        })
      });

    } catch (error) {
      console.error("Lỗi hệ thống kho:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 2. REAL-TIME SYNC
   */
  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('warehouse_realtime_v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'material_lots' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_records' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batch_records' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen font-sans text-slate-900 relative">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
            <Warehouse className="text-blue-600" size={40} /> Điều hành Kho Vận
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Truy xuất nguồn gốc & Tồn kho thực tế</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={fetchData} 
            className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
          </button>
          
          <button 
            onClick={() => setShowExportModal(true)} 
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95"
          >
            <Truck size={18} /> Xuất kho hàng hóa
          </button>

          <button 
            onClick={() => setShowBulkModal(true)} 
            className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase hover:bg-blue-600 shadow-xl transition-all active:scale-95"
          >
            <Plus size={18} /> Nhập kho vật tư mới
          </button>
        </div>
      </div>

      {/* DASHBOARD STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatCard label="Vật tư cần mua" value={reports.toPurchase.length} color="orange" icon={<ShoppingCart size={20} />} loading={loading} data={reports.toPurchase} />
        <StatCard label="Lô sắp hết hạn" value={reports.expiringSoon.length} color="rose" icon={<Clock size={20} />} loading={loading} data={reports.expiringSoon} />
        <StatCard label="Cần sản xuất thêm" value={reports.toProduce.length} color="emerald" icon={<Factory size={20} />} loading={loading} data={reports.toProduce} />
      </div>

      {/* INVENTORY TABLE CARD */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* FILTERS BAR */}
        <div className="p-8 border-b flex flex-col lg:flex-row justify-between items-center gap-6 bg-slate-50/50">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm mã SKU hoặc tên mặt hàng..."
              className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex bg-slate-200/50 p-1.5 rounded-[1.5rem] w-full lg:w-auto overflow-x-auto">
            {['all', 'Pending', 'Passed', 'Failed', 'Expired'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                    statusFilter === filter ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {filter === 'all' ? 'Tất cả trạng thái' : filter}
              </button>
            ))}
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b bg-slate-50/30">
                <th className="px-8 py-6 w-20"></th>
                <th className="px-8 py-6">Mã SKU</th>
                <th className="px-8 py-6">Tên Vật tư / Hàng hóa</th>
                <th className="px-8 py-6 text-center">Tồn kho khả dụng</th>
                <th className="px-8 py-6">Trạng thái định mức</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stock
                .filter(item => {
                  const matchSearch = (item.name + item.id).toLowerCase().includes(searchTerm.toLowerCase());
                  const hasMatchingStatus = statusFilter === 'all' || item.lots.some((l: any) => l.status === statusFilter);
                  return matchSearch && hasMatchingStatus;
                })
                .map((item, index) => (
                  // Key duy nhất kết hợp SKU (item.id) và index để an toàn tuyệt đối
                  <React.Fragment key={`${item.id}-${index}`}>
                    <tr
                      className={`group hover:bg-blue-50/30 cursor-pointer transition-all ${expandedSKU === item.id ? 'bg-blue-50/20' : ''}`}
                      onClick={() => setExpandedSKU(expandedSKU === item.id ? null : item.id)}
                    >
                      <td className="px-8 py-7 text-center">
                        <div className={`p-2 rounded-lg transition-all ${expandedSKU === item.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                          {expandedSKU === item.id ? <ChevronUp size={16}/> : <ChevronDown size={16} />}
                        </div>
                      </td>
                      <td className="px-8 py-7 font-black text-blue-600 text-xs italic tracking-wider">
                        {item.id}
                      </td>
                      <td className="px-8 py-7">
                        <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold mt-1">{item.category || 'Chưa phân loại'}</p>
                      </td>
                      <td className="px-8 py-7 text-center">
                        <span className="text-xl font-black text-slate-900">{Number(item.qty).toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-black ml-2">{item.unit}</span>
                      </td>
                      <td className="px-8 py-7">
                        <div className="flex flex-col gap-1">
                            <span className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-full border w-fit ${
                                item.stock_status === 'LOW' 
                                ? 'bg-rose-50 text-rose-600 border-rose-100' 
                                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                                {item.stock_status === 'LOW' ? '⚠️ Dưới hạn mức' : '✓ An toàn'}
                            </span>
                            {item.stock_status === 'LOW' && (
                                <span className="text-[9px] text-rose-400 font-bold ml-1">
                                    (Tối thiểu: {item.min_stock} {item.unit})
                                </span>
                            )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* CHI TIẾT CÁC LÔ HÀNG KHI MỞ RỘNG */}
                    {expandedSKU === item.id && (
                      <tr>
                        <td colSpan={5} className="bg-slate-50/80 px-12 py-8 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center gap-2 mb-6">
                            <Clock size={14} className="text-blue-500" />
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                              Chi tiết lô nhập kho ({item.lots.length})
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {item.lots
                              .filter((l: any) => statusFilter === 'all' || l.status === statusFilter)
                              .map((lot: any, lIdx: number) => (
                                <QRCodeStation key={`${lot.id}-${lIdx}`} lot={lot} materialName={item.name} />
                              ))}
                            {item.lots.length === 0 && (
                              <p className="text-xs italic text-slate-400">Không có lô hàng nào phù hợp với bộ lọc.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PANEL: XUẤT KHO */}
      {showExportModal && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500"
            onClick={() => setShowExportModal(false)}
          />
          <div className="relative w-full max-w-5xl bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] h-full overflow-hidden animate-in slide-in-from-right duration-500 flex flex-col rounded-l-[3rem]">
            <div className="p-8 flex justify-between items-center bg-slate-50/50 border-b">
               <div>
                 <span className="text-[10px] font-black uppercase text-blue-600 tracking-[0.3em]">Hệ thống điều vận</span>
                 <h3 className="text-xl font-black uppercase italic tracking-tighter">Xử lý lệnh xuất kho</h3>
               </div>
               <button 
                onClick={() => setShowExportModal(false)}
                className="p-4 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all text-slate-400 active:scale-90"
              >
                <Plus size={28} className="rotate-45" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ExportManager onSuccess={() => fetchData()} />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NHẬP VẬT TƯ */}
      <BulkImportModal 
        show={showBulkModal} 
        onClose={() => setShowBulkModal(false)} 
        bomList={bomList} 
        onSuccess={fetchData} 
      />

    </div>
  );
}