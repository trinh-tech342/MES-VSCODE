"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Warehouse, Search, Plus, RefreshCw, Truck,
  Clock, ShoppingCart, Factory, ChevronDown, ChevronRight, ChevronUp, Loader2,
  AlertTriangle, CalendarClock, TrendingDown, Box, Layers, Bell
} from 'lucide-react';

import { BulkImportModal } from './BulkImportModal';
import StatCard from './StatCard';
import QRCodeStation from './QRCodeStation';
import ExportManager from './ExportManager';
import EarlyWarningSystem from './EarlyWarningSystem';

// --- ĐỊNH NGHĨA KIỂU DỮ LIỆU CHUẨN ---
interface StockItem {
  id: string;
  name: string;
  category: string;
  qty: number;
  unit: string;
  min_stock: number;
  dailyUsage: number;
  leadTime: number;
  reorderPoint: number;
  daysUntilOrder: number;
  expectedArrival: string;
  needsOrder: boolean;
  lots: any[];
}

export default function WarehouseTab() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [bomList, setBomList] = useState<any[]>([]);
  const [expandedSKU, setExpandedSKU] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [preFillData, setPreFillData] = useState<any>(null);
  const [resolvedSkus, setResolvedSkus] = useState<string[]>([]); // Lưu SKU đã xử lý hôm nay

  const [reports, setReports] = useState({
    toPurchase: [] as StockItem[],
    expiringSoon: [] as any[],
    toProduce: [] as StockItem[]
  });

  // 1. Hàm lấy dữ liệu từ Supabase
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Lấy đồng thời: Tồn kho, Lô hàng, Danh mục, và Các SKU đã xử lý hôm nay
      const [summaryRes, lotsRes, catalogRes, resolvedRes] = await Promise.all([
        supabase.from('v_inventory_summary').select('*'),
        supabase.from('material_lots').select('*').gt('remaining_quantity', 0).order('exp_date', { ascending: true }),
        supabase.from('material_catalog').select('*'),
        supabase.from('supply_chain_actions').select('sku').eq('resolved_date', today)
      ]);

      if (summaryRes.error) throw summaryRes.error;

      const allLots = lotsRes.data || [];
      const catalog = catalogRes.data || [];
      const resolvedToday = resolvedRes.data?.map(item => item.sku) || [];
      
      setBomList(catalog);
      setResolvedSkus(resolvedToday);

      const processedData: StockItem[] = (summaryRes.data || []).map(item => {
        const catItem = catalog.find(c => c.sku === item.id);
        const dailyUsage = catItem?.average_daily_usage || 2; 
        const leadTime = catItem?.lead_time || 7;
        const minStock = item.min_stock || 0;
        const reorderPoint = (dailyUsage * leadTime) + minStock;
        const daysUntilOrder = Math.floor((item.qty - reorderPoint) / dailyUsage);
        const expectedArrival = new Date();
        expectedArrival.setDate(expectedArrival.getDate() + leadTime);

        return {
          ...item,
          dailyUsage, leadTime, reorderPoint, daysUntilOrder,
          expectedArrival: expectedArrival.toISOString(),
          needsOrder: item.qty <= reorderPoint,
          lots: allLots.filter(l => l.material_sku === item.id)
        };
      });

      setStock(processedData);
      
      // Tự động mở rộng các nhóm có dữ liệu
      const categories = Array.from(new Set(processedData.map(i => i.category || 'Chưa phân loại')));
      setExpandedCategories(categories);

      // Cập nhật báo cáo nhanh cho StatCards
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      setReports({
        toPurchase: processedData.filter(i => i.needsOrder && i.category?.toLowerCase().includes('nguyên liệu')),
        expiringSoon: allLots.filter(l => l.exp_date && new Date(l.exp_date) <= thirtyDaysLater).map(l => ({
          ...l, id: l.material_sku, name: l.material_name,
          lot_display: `Lô: ${l.lot_number} (Còn ${l.remaining_quantity} ${l.unit})`
        })),
        toProduce: processedData.filter(i => i.needsOrder && i.category?.toLowerCase().includes('thành phẩm'))
      });
    } catch (error) { 
      console.error("Lỗi tải dữ liệu kho:", error); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Logic lọc dữ liệu cho Hệ thống cảnh báo (EarlyWarning)
  // Chỉ hiện những SKU chưa được xử lý trong ngày
  const earlyWarningData = useMemo(() => {
    return stock.filter(item => !resolvedSkus.includes(item.id));
  }, [stock, resolvedSkus]);

  // 3. Logic tìm kiếm và nhóm bảng
  const groupedData = useMemo(() => {
    const filtered = stock.filter(item => 
      (item.name + item.id).toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.reduce((acc, item) => {
      const cat = item.category || 'Chưa phân loại';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, StockItem[]>);
  }, [stock, searchTerm]);

  // 4. Xử lý sự kiện từ EarlyWarningSystem
  const handleAutoPurchase = (item: any) => {
    const suggestQty = Math.max(0, (item.min_stock || 0) - (item.qty || 0));
    setPreFillData({
      sku: item.id,
      name: item.name,
      quantity: suggestQty > 0 ? suggestQty : 1,
      unit: item.unit
    });
    setShowBulkModal(true);
  };

    const handleAutoProduction = async (item: any) => {
      try {
        // 1. Lấy quy trình sản xuất của SKU
        const { data: processData, error: processError } = await supabase
          .from('product_process')
          .select('steps')
          .eq('sku', item.id)
          .single();

        if (processError || !processData) {
          alert(`SKU ${item.id} chưa được cấu hình quy trình sản xuất!`);
          return;
        }

        // 2. Tính số lượng cần sản xuất (Ví dụ: Min - Hiện tại)
        const suggestQty = Math.max(0, (item.min_stock || 0) - (item.qty || 0)) || 10;

        // 3. Gọi hàm RPC để đẩy sang PQC/Sản xuất
        const { error: rpcError } = await supabase.rpc('approve_production_v1', {
          p_item_id: null, 
          p_sku: item.id, 
          p_order_id: null, 
          p_quantity: suggestQty, 
          p_steps: processData.steps 
        });

        if (rpcError) throw rpcError;

        alert(`✅ Đã lập lệnh sản xuất cho ${item.id} thành công!`);
        fetchData(); // Load lại dữ liệu kho
      } catch (error: any) {
        console.error(error);
        alert("Lỗi: " + error.message);
      }
    };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen font-sans text-slate-900">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div className="flex gap-3">
          <button onClick={fetchData} className="p-4 bg-white border rounded-2xl shadow-sm hover:bg-slate-50 transition-colors">
            {loading ? <Loader2 className="animate-spin text-blue-600"/> : <RefreshCw className="text-slate-600"/>}
          </button>
          <button onClick={() => setShowExportModal(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 border-b-4 border-blue-800">
            <Truck size={18}/> Xuất kho
          </button>
          <button onClick={() => setShowBulkModal(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 border-b-4 border-slate-700">
            <Plus size={18}/> Nhập kho
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatCard label="Cần đặt hàng" value={reports.toPurchase.length} color="orange" icon={<ShoppingCart size={20} />} data={reports.toPurchase} />
        <StatCard label="Lô sắp hết hạn" value={reports.expiringSoon.length} color="rose" icon={<Clock size={20} />} data={reports.expiringSoon} />
        <StatCard label="Cần sản xuất" value={reports.toProduce.length} color="emerald" icon={<Factory size={20} />} data={reports.toProduce} />
      </div>

      {/* HỆ THỐNG CẢNH BÁO SỚM */}
      <EarlyWarningSystem 
          data={earlyWarningData} 
          onSuccess={fetchData} 
          onPurchase={handleAutoPurchase}
          onProduction={handleAutoProduction}
      />

      {/* BẢNG TỒN KHO CHI TIẾT */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-8 border-b bg-slate-50/50 flex flex-col md:flex-row gap-6 justify-between items-center">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              type="text" 
              placeholder="Tìm nhanh SKU hoặc tên..." 
              className="w-full pl-14 pr-6 py-4 border rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="flex items-center gap-2 px-5 py-2 bg-blue-50 border border-blue-100 rounded-full text-blue-600">
            <Layers size={14} />
            <span className="text-[10px] font-black uppercase">Phân nhóm tự động</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b bg-slate-50/30">
                <th className="px-8 py-6 w-20 text-center">Mở</th>
                <th className="px-8 py-6">Vật tư & SKU</th>
                <th className="px-8 py-6 text-center">Tồn khả dụng</th>
                <th className="px-8 py-6 w-[380px]">Dự báo Thu mua</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(groupedData).map(([category, items]) => (
                <React.Fragment key={category}>
                  {/* DÒNG TIÊU ĐỀ NHÓM */}
                  <tr onClick={() => toggleCategory(category)} className="bg-slate-50/80 border-y border-slate-100 cursor-pointer hover:bg-blue-50 transition-all group">
                    <td colSpan={4} className="px-8 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`transition-transform duration-300 ${expandedCategories.includes(category) ? 'rotate-90 text-blue-600' : 'text-slate-400'}`}>
                            <ChevronRight size={18} />
                          </div>
                          <Box size={18} className="text-blue-500/50" />
                          <span className="text-xs font-black uppercase tracking-widest text-slate-700">{category}</span>
                          <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] text-blue-600 font-bold">{items.length}</span>
                        </div>
                        {items.some(i => i.needsOrder) && (
                          <span className="text-[9px] font-black text-rose-500 bg-rose-100/50 px-3 py-1 rounded-full border border-rose-200 animate-pulse">NHẬP HÀNG GẤP</span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* DÒNG CHI TIẾT SẢN PHẨM */}
                  {expandedCategories.includes(category) && items.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr onClick={() => setExpandedSKU(expandedSKU === item.id ? null : item.id)} className={`group cursor-pointer ${expandedSKU === item.id ? 'bg-blue-50/40' : 'hover:bg-slate-50/30'}`}>
                        <td className="px-8 py-5 text-center">
                          <div className={`p-2 rounded-xl inline-block transition-all ${expandedSKU === item.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {expandedSKU === item.id ? <ChevronUp size={14}/> : <ChevronDown size={14} />}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-[9px] font-black text-blue-500 italic mb-0.5">{item.id}</p>
                          <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="text-lg font-black text-slate-900">{item.qty.toLocaleString()}</span>
                          <span className="text-[9px] text-slate-400 uppercase font-black ml-1.5">{item.unit}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className={`flex items-center gap-3 p-3 rounded-2xl border ${item.daysUntilOrder <= 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                            <div className={`w-2 h-2 rounded-full ${item.daysUntilOrder <= 0 ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
                            <div className="flex-1">
                              <p className="text-[9px] font-black uppercase text-slate-600">{item.daysUntilOrder <= 0 ? 'Phải đặt ngay' : 'Còn an toàn'}</p>
                              <p className="text-[8px] text-slate-400 font-bold">Hạn chót: {new Date(item.expectedArrival).toLocaleDateString('vi-VN')}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-[10px] font-black ${item.daysUntilOrder <= 0 ? 'text-rose-600' : 'text-slate-800'}`}>{item.daysUntilOrder}d</p>
                              <p className="text-[8px] text-slate-400 uppercase">Leadtime</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {expandedSKU === item.id && (
                        <tr>
                          <td colSpan={4} className="bg-slate-50/50 px-12 py-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                              {item.lots.map((lot, idx) => (
                                <QRCodeStation key={idx} lot={lot} materialName={item.name} />
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL XUẤT KHO */}
      {showExportModal && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowExportModal(false)} />
          <div className="relative w-full max-w-5xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col rounded-l-[3rem]">
            <div className="p-8 flex justify-between items-center border-b">
              <h3 className="text-xl font-black uppercase italic">Xuất kho vật tư</h3>
              <button onClick={() => setShowExportModal(false)} className="p-4 bg-rose-50 text-rose-500 rounded-2xl rotate-45"><Plus size={28}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8"><ExportManager onSuccess={fetchData} /></div>
          </div>
        </div>
      )}

      {/* MODAL NHẬP KHO (CÓ HỖ TRỢ ĐỔ DỮ LIỆU TỰ ĐỘNG) */}
      <BulkImportModal 
        show={showBulkModal} 
        onClose={() => {
          setShowBulkModal(false);
          setPreFillData(null); 
        }} 
        bomList={bomList} 
        onSuccess={fetchData} 
        initialData={preFillData} 
      />
    </div>
  );
}