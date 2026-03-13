"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, Loader2, Trash2, Beaker, Package, Search, Plus } from 'lucide-react';

export default function MaterialUsageModal({ batch, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [usageList, setUsageList] = useState<any[]>([]);
  const [availableLots, setAvailableLots] = useState<Record<string, any[]>>({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // 1. Lấy định mức (BOM) của sản phẩm này để gợi ý sẵn danh sách
      const { data: bomData } = await supabase
        .from('product_bom')
        .select(`material_sku, material_name, unit, type`) // type: 'Material' hoặc 'Packaging'
        .eq('product_id', batch.product_id);
      
      // 2. Lấy tất cả các lô hàng đang còn tồn trong kho
      const { data: allLots } = await supabase
        .from('material_lots')
        .select('*')
        .gt('remaining_quantity', 0)
        .in('status', ['Hoàn tất', 'Passed']); // Chỉ lấy hàng đã qua QC

      // Nhóm lô theo SKU để dễ tra cứu
      const groupedLots = (allLots || []).reduce((acc: any, lot) => {
        const sku = lot.material_sku;
        if (!acc[sku]) acc[sku] = [];
        acc[sku].push(lot);
        return acc;
      }, {});
      
      setAvailableLots(groupedLots);

      // Khởi tạo danh sách nhập dựa trên BOM
      if (bomData) {
        setUsageList(bomData.map(item => ({
          sku: item.material_sku,
          name: item.material_name,
          unit: item.unit,
          type: item.type,
          selectedLotId: '',
          actualQty: '',
        })));
      }
      setLoading(false);
    };

    loadData();
  }, [batch]);

  const handleSave = async () => {
    // Lọc ra các dòng có nhập số lượng và chọn lô
    const validEntries = usageList.filter(i => i.actualQty > 0 && i.selectedLotId);
    if (validEntries.length === 0) return alert("Vui lòng nhập số lượng và chọn lô!");

    setLoading(true);
    try {
      const insertData = validEntries.map(item => ({
        batch_id: batch.batch_id,
        material_sku: item.sku,
        material_lot_id: item.selectedLotId,
        quantity_used: parseFloat(item.actualQty),
        unit: item.unit,
        recorded_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('batch_material_usage').insert(insertData);
      if (error) throw error;

      alert("Đã lưu dữ liệu nạp vật tư thành công!");
      onSuccess();
      onClose();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-amber-50 border-b flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-100">
              <Beaker size={20} />
            </div>
            <div>
              <h3 className="font-black text-xs uppercase text-amber-600 tracking-widest">Nạp nguyên liệu & Bao bì</h3>
              <p className="font-black text-slate-800 uppercase italic leading-none">{batch.batch_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all"><X size={20}/></button>
        </div>

        {/* Nội dung nhập liệu */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {usageList.length === 0 && !loading && (
            <div className="text-center py-10 text-slate-400 font-bold uppercase text-[10px]">Chưa có định mức cho sản phẩm này</div>
          )}

          {usageList.map((item, idx) => (
            <div key={idx} className="group relative bg-slate-50 hover:bg-white border border-slate-100 hover:border-amber-200 rounded-[2rem] p-5 transition-all flex flex-wrap md:flex-nowrap items-center gap-4">
              
              {/* Icon phân loại */}
              <div className={`p-3 rounded-2xl ${item.type === 'Packaging' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                {item.type === 'Packaging' ? <Package size={18}/> : <Beaker size={18}/>}
              </div>

              {/* Thông tin vật tư */}
              <div className="flex-1 min-w-[150px]">
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">{item.sku}</p>
                <p className="text-xs font-black text-slate-800 uppercase leading-tight">{item.name}</p>
              </div>

              {/* Chọn Lô từ kho */}
              <div className="w-full md:w-48">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Chọn Lô tồn kho</p>
                <select 
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  value={item.selectedLotId}
                  onChange={(e) => {
                    const newList = [...usageList];
                    newList[idx].selectedLotId = e.target.value;
                    setUsageList(newList);
                  }}
                >
                  <option value="">-- Chọn Lot --</option>
                  {(availableLots[item.sku] || []).map(lot => (
                    <option key={lot.id} value={lot.id}>
                      {lot.lot_number} (Tồn: {lot.remaining_quantity} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nhập số lượng */}
              <div className="w-full md:w-32">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Số lượng ({item.unit})</p>
                <input 
                  type="number"
                  placeholder="0.00"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  value={item.actualQty}
                  onChange={(e) => {
                    const newList = [...usageList];
                    newList[idx].actualQty = e.target.value;
                    setUsageList(newList);
                  }}
                />
              </div>

              <button 
                onClick={() => setUsageList(usageList.filter((_, i) => i !== idx))}
                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={16}/>
              </button>
            </div>
          ))}

          <button 
            onClick={() => setUsageList([...usageList, { sku: '', name: 'Vật tư ngoài định mức', unit: 'Kg', type: 'Material', selectedLotId: '', actualQty: '' }])}
            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[2rem] text-[10px] font-black text-slate-400 uppercase hover:bg-slate-50 transition-all"
          >
            + Thêm vật tư khác
          </button>
        </div>

        {/* Footer */}
        <div className="p-8 border-t bg-slate-50 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Hủy</button>
          <button 
            disabled={loading}
            onClick={handleSave}
            className="flex-[2] bg-amber-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-amber-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Xác nhận nạp & Trừ kho
          </button>
        </div>
      </div>
    </div>
  );
}