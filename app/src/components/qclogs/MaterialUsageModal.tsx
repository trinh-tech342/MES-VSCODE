"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, Loader2, Trash2, Beaker, Package, Plus } from 'lucide-react';

export default function MaterialUsageModal({ batch, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [usageList, setUsageList] = useState<any[]>([]);
  const [availableLots, setAvailableLots] = useState<Record<string, any[]>>({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Lấy định mức (BOM)
        const { data: bomData } = await supabase
          .from('product_bom')
          .select(`material_sku, material_name, unit, type`)
          .eq('product_id', batch.product_id);

        // 2. Lấy lô hàng còn tồn (Passed/Hoàn tất)
        const { data: allLots } = await supabase
          .from('material_lots')
          .select('*')
          .gt('remaining_quantity', 0)
          .in('status', ['Hoàn tất', 'Passed', 'pass']); // Thêm 'pass' theo logic DB của bạn

        const groupedLots = (allLots || []).reduce((acc: any, lot) => {
          const sku = lot.material_sku;
          if (!acc[sku]) acc[sku] = [];
          acc[sku].push(lot);
          return acc;
        }, {});
        
        setAvailableLots(groupedLots);

        // 3. Khởi tạo danh sách
        if (bomData && bomData.length > 0) {
          setUsageList(bomData.map(item => ({
            sku: item.material_sku,
            name: item.material_name,
            unit: item.unit,
            type: item.type,
            selectedLotId: '',
            actualQty: '',
            isFromBom: true
          })));
        } else {
          setUsageList([{ sku: '', name: '', unit: '', type: 'Material', selectedLotId: '', actualQty: '', isFromBom: false }]);
        }
      } catch (err) {
        console.error("Lỗi tải dữ vote:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [batch]);

  const handleSave = async () => {
    const validEntries = usageList.filter(i => parseFloat(i.actualQty) > 0 && i.selectedLotId);
    if (validEntries.length === 0) return alert("Vui lòng chọn Lô và nhập Số lượng!");

    setLoading(true);
    try {
      const insertData = validEntries.map(item => ({
        batch_id: batch.batch_id,
        material_lot_id: item.selectedLotId,
        actual_quantity: parseFloat(item.actualQty),
        unit: item.unit
      }));

      const { error } = await supabase.from('batch_material_usage').insert(insertData);
      if (error) throw error;

      alert("Lưu dữ liệu thành công!");
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (idx: number, fields: any) => {
    const newList = [...usageList];
    newList[idx] = { ...newList[idx], ...fields };
    setUsageList(newList);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-amber-50 border-b flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg">
              <Beaker size={20} />
            </div>
            <div>
              <h3 className="font-black text-[10px] uppercase text-amber-600 tracking-widest">Nạp nguyên liệu & Bao bì</h3>
              <p className="font-black text-slate-800 uppercase italic leading-none">{batch.batch_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400"><X size={20}/></button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {usageList.map((item, idx) => (
            <div key={idx} className="group relative bg-slate-50 hover:bg-white border border-slate-100 hover:border-amber-200 rounded-[1.5rem] p-4 transition-all flex flex-wrap md:flex-nowrap items-center gap-4">
              
              {/* Material Info - ĐÃ SỬA ĐỂ HIỆN TÊN */}
              <div className="flex items-center gap-3 w-full md:w-2/5">
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${item.type === 'Packaging' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {item.type === 'Packaging' ? <Package size={16}/> : <Beaker size={16}/>}
                </div>
                <div className="flex-1 overflow-hidden">
                  {item.isFromBom ? (
                    <>
                      <p className="text-[9px] font-black text-slate-400 uppercase leading-none">{item.sku}</p>
                      <p className="text-[11px] font-bold text-slate-700 uppercase line-clamp-1">{item.name}</p>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <p className="text-[8px] font-black text-amber-600 uppercase">Chọn vật tư ngoài định mức:</p>
                      <select 
                        className="w-full bg-transparent border-b-2 border-slate-200 text-[11px] font-bold outline-none focus:border-amber-500 pb-1 cursor-pointer text-slate-700 uppercase"
                        value={item.sku}
                        onChange={(e) => {
                          const selectedSku = e.target.value;
                          const lots = availableLots[selectedSku] || [];
                          const materialName = lots[0]?.material_name || 'Vật tư không tên';
                          updateRow(idx, { 
                            sku: selectedSku, 
                            unit: lots[0]?.unit || 'Kg', 
                            name: materialName,
                            type: lots[0]?.type || 'Material'
                          });
                        }}
                      >
                        <option value="">-- Click để chọn tên vật tư --</option>
                        {Object.entries(availableLots).map(([sku, lots]) => (
                          <option key={sku} value={sku}>
                            {lots[0]?.material_name || sku} ({sku})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Lot Selection */}
              <div className="flex-1 min-w-[140px]">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Lô tồn kho</p>
                <select 
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-amber-500"
                  value={item.selectedLotId}
                  disabled={!item.sku}
                  onChange={(e) => updateRow(idx, { selectedLotId: e.target.value })}
                >
                  <option value="">Chọn Lot...</option>
                  {(availableLots[item.sku] || []).map(lot => (
                    <option key={lot.id} value={lot.id}>
                      {lot.lot_number} - Còn: {lot.remaining_quantity} {lot.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Input */}
              <div className="w-24 md:w-32">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Số lượng ({item.unit || '...'})</p>
                <input 
                  type="number"
                  placeholder="0.00"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-black outline-none focus:ring-2 focus:ring-amber-500"
                  value={item.actualQty}
                  onChange={(e) => updateRow(idx, { actualQty: e.target.value })}
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
            onClick={() => setUsageList([...usageList, { sku: '', name: '', unit: '', type: 'Material', selectedLotId: '', actualQty: '', isFromBom: false }])}
            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase hover:bg-slate-50 hover:border-amber-300 hover:text-amber-600 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={14}/> Thêm nguyên liệu ngoài định mức
          </button>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-slate-50 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400">Hủy bỏ</button>
          <button 
            disabled={loading}
            onClick={handleSave}
            className="flex-[2] bg-amber-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Xác nhận nạp & Trừ kho
          </button>
        </div>
      </div>
    </div>
  );
}