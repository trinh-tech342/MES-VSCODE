"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Loader2, Save, Package, Combine, CheckCircle2 } from 'lucide-react';
import Select from 'react-select';
import { supabase } from '../../lib/supabase';

interface ProductRow {
  id?: string;
  sku: string;
  product_name: string;
  specification: string;
  quantity: number;
  unit: string;
  status?: string;
}

const unitOptions = [
  { value: 'kg', label: 'kg' },
  { value: 'cái', label: 'cái' },
  { value: 'thùng', label: 'thùng' },
  { value: 'túi', label: 'túi' },
  { value: 'hộp', label: 'hộp' },
  { value: 'gói', label: 'gói' },
];

export default function OrderEditForm() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderOptions, setOrderOptions] = useState<any[]>([]);
  const [orderInfo, setOrderInfo] = useState({ customer: '', deadline: '' });
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [productList, setProductList] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  // 1. Load danh sách đơn hàng và sản phẩm ban đầu
  useEffect(() => {
    const fetchData = async () => {
      const [{ data: orders }, { data: products }] = await Promise.all([
        supabase.from('orders').select('id, order_number, customer').order('created_at', { ascending: false }),
        supabase.from('products').select('*')
      ]);
      if (orders) setOrderOptions(orders.map(o => ({ value: o.id, label: `${o.order_number} - ${o.customer}` })));
      if (products) setProductList(products);
    };
    fetchData();
  }, []);

  // 2. Hàm Load chi tiết (Dùng để khởi tạo và REFRESH sau khi lưu)
  const loadOrderDetails = useCallback(async (orderId: string) => {
    if (!orderId) return;
    setSelectedOrderId(orderId);
    try {
      const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
      
      if (order) setOrderInfo({ customer: order.customer || '', deadline: order.deadline || '' });
      setRows(items || []);
    } catch (err) {
      console.error("Lỗi khi load dữ liệu:", err);
    }
  }, []);

  const productOptions = productList.map(p => ({
    value: p.product_name, label: p.product_name, sku: p.sku, specification: p.specification, unit: p.unit
  }));

  const updateRow = (index: number, field: keyof ProductRow, value: any) => {
    const newRows = [...rows];
    if (field === 'product_name') {
      newRows[index] = { 
        ...newRows[index], 
        product_name: value?.value || '', 
        sku: value?.sku || '', 
        specification: value?.specification || '',
        unit: value?.unit || 'kg'
      };
    } else if (field === 'unit') {
      newRows[index] = { ...newRows[index], unit: value?.value || 'kg' };
    } else {
      newRows[index] = { ...newRows[index], [field]: value };
    }
    setRows(newRows);
  };

  const handleAutoMerge = () => {
    const mergedMap = new Map<string, ProductRow>();
    rows.forEach(row => {
      if (!row.sku) return;
      const key = `${row.sku}-${row.specification}-${row.unit}`;
      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key)!;
        existing.quantity += Number(row.quantity);
        if (!existing.id && row.id) existing.id = row.id;
      } else {
        mergedMap.set(key, { ...row, quantity: Number(row.quantity) });
      }
    });
    setRows(Array.from(mergedMap.values()));
  };

  // 3. HÀM XỬ LÝ LƯU & LÀM MỚI TRANG
  const handleUpdateOrder = async () => {
    if (!selectedOrderId) return alert("Vui lòng chọn đơn hàng!");
    setStatus('loading');

    try {
      // BƯỚC A: Cập nhật Header Đơn hàng
      await supabase.from('orders')
        .update({ customer: orderInfo.customer, deadline: orderInfo.deadline })
        .eq('id', selectedOrderId);

      // BƯỚC B: Xử lý Xóa các dòng đã bị user xóa khỏi UI
      const { data: dbItems } = await supabase.from('order_items').select('id').eq('order_id', selectedOrderId);
      const dbIds = dbItems?.map(item => item.id) || [];
      const uiIds = rows.filter(r => r.id).map(r => r.id);
      const idsToDelete = dbIds.filter(id => !uiIds.includes(id));

      if (idsToDelete.length > 0) {
        await supabase.from('order_items').delete().in('id', idsToDelete);
      }

      // BƯỚC C: Phân loại Insert (mới) và Upsert (cũ)
      const toUpdate = [];
      const toInsert = [];

      for (const row of rows) {
        const baseData = {
          order_id: selectedOrderId,
          sku: row.sku,
          product_name: row.product_name,
          specification: row.specification || '',
          quantity: Number(row.quantity),
          unit: row.unit || 'kg',
          status: row.status || 'WAITING'
        };

        if (row.id) {
          toUpdate.push({ id: row.id, ...baseData });
        } else {
          toInsert.push(baseData);
        }
      }

      // BƯỚC D: Thực thi ghi dữ liệu
      const promises = [];
      if (toUpdate.length > 0) {
        promises.push(supabase.from('order_items').upsert(toUpdate));
      }
      if (toInsert.length > 0) {
        promises.push(supabase.from('order_items').insert(toInsert));
      }

      const results = await Promise.all(promises);
      const errorResult = results.find(r => r.error);
      if (errorResult?.error) throw errorResult.error;

      // BƯỚC E: THÀNH CÔNG - LÀM MỚI DỮ LIỆU
      setStatus('success');
      
      // Load lại từ server để lấy các ID mới và trạng thái mới nhất
      await loadOrderDetails(selectedOrderId); 
      
      // Hiện thông báo thành công trong 1.5s rồi quay về trạng thái bình thường
      setTimeout(() => setStatus('idle'), 1500);

    } catch (err: any) {
      console.error("Lỗi:", err);
      alert("Lỗi: " + err.message);
      setStatus('idle');
    }
  };

  const customSelectStyles = {
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
    control: (base: any) => ({
      ...base,
      borderRadius: '12px',
      border: 'none',
      backgroundColor: '#f8fafc',
      fontWeight: 'bold',
      minHeight: '40px'
    })
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-slate-50 min-h-screen rounded-[2.5rem]">
      <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter">
            <Package className="text-blue-600" size={32} /> Chỉnh sửa chi tiết
          </h2>
          {selectedOrderId && (
            <button onClick={handleAutoMerge} className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-2xl text-[11px] font-black uppercase hover:bg-orange-600 shadow-lg shadow-orange-100 transition-all">
              <Combine size={18} /> Gộp SKU & Đơn vị
            </button>
          )}
        </div>

        <div className="mb-10 p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
          <label className="block text-[10px] font-black uppercase text-blue-400 mb-2 ml-1">Tìm kiếm đơn hàng</label>
          {isMounted && (
            <Select
              options={orderOptions}
              onChange={(opt) => {
                if(opt) {
                    setStatus('loading');
                    loadOrderDetails(opt.value).finally(() => setStatus('idle'));
                }
              }}
              className="font-bold"
              menuPortalTarget={document.body}
              styles={customSelectStyles}
              placeholder="Chọn mã đơn hàng..."
            />
          )}
        </div>

        {selectedOrderId ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Khách hàng</label>
                <input type="text" className="w-full px-5 py-3.5 bg-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={orderInfo.customer} onChange={(e) => setOrderInfo({ ...orderInfo, customer: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Hạn giao</label>
                <input type="date" className="w-full px-5 py-3.5 bg-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={orderInfo.deadline} onChange={(e) => setOrderInfo({ ...orderInfo, deadline: e.target.value })} />
              </div>
            </div>

            <div className="mb-8 border border-slate-100 rounded-2xl overflow-visible bg-white shadow-sm">
              <table className="w-full">
                <thead className="bg-slate-50/80 border-b">
                  <tr className="text-[10px] uppercase text-slate-400 font-black">
                    <th className="py-4 px-4 text-left">Sản phẩm</th>
                    <th className="py-4 px-4 text-left">Quy cách</th>
                    <th className="py-4 px-4 text-center w-28">Số lượng</th>
                    <th className="py-4 px-4 text-center w-36">Đơn vị</th>
                    <th className="py-4 px-4 text-center w-32">Trạng thái</th>
                    <th className="py-4 px-4 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isLocked = row.status !== 'WAITING' && row.id;
                    return (
                      <tr key={idx} className={`border-b border-slate-50 transition-colors ${isLocked ? 'bg-slate-50/50' : 'hover:bg-blue-50/5'}`}>
                        <td className="py-3 px-4 min-w-[220px]">
                          {isMounted && (
                            <Select
                              options={productOptions}
                              isDisabled={!!isLocked}
                              value={productOptions.find(p => p.sku === row.sku)}
                              onChange={(val) => updateRow(idx, 'product_name', val)}
                              menuPortalTarget={document.body}
                              styles={customSelectStyles}
                              placeholder="Chọn SP..."
                            />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <input disabled={!!isLocked} type="text" value={row.specification} onChange={(e) => updateRow(idx, 'specification', e.target.value)} className="w-full p-2 bg-transparent text-sm font-semibold outline-none" placeholder="..." />
                        </td>
                        <td className="py-3 px-4">
                          <input disabled={!!isLocked} type="number" value={row.quantity} onChange={(e) => updateRow(idx, 'quantity', e.target.value)} className="w-full text-center font-black text-blue-600 bg-transparent outline-none" />
                        </td>
                        <td className="py-3 px-4 min-w-[120px]">
                          {isMounted && (
                            <Select
                              options={unitOptions}
                              isDisabled={!!isLocked}
                              value={unitOptions.find(u => u.value === row.unit) || { value: row.unit, label: row.unit }}
                              onChange={(val) => updateRow(idx, 'unit', val)}
                              menuPortalTarget={document.body}
                              styles={customSelectStyles}
                              placeholder="Đơn vị"
                            />
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-[10px] font-black px-3 py-1.5 rounded-full ${row.status === 'WAITING' ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'}`}>
                            {row.status || 'WAITING'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isLocked && (
                            <button onClick={() => setRows(rows.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 p-2 transition-colors">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <button onClick={() => setRows([...rows, { sku: '', product_name: '', specification: '', quantity: 1, unit: 'kg', status: 'WAITING' }])} className="flex-1 py-4.5 bg-white text-slate-500 rounded-3xl font-black border-2 border-dashed border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
                + THÊM DÒNG MỚI
              </button>
              <button 
                onClick={handleUpdateOrder} 
                disabled={status === 'loading'} 
                className={`flex-[2] py-4.5 rounded-3xl font-black text-white shadow-xl transition-all flex items-center justify-center gap-2 
                  ${status === 'loading' ? 'bg-slate-400 cursor-not-allowed' : 
                    status === 'success' ? 'bg-green-500' : 'bg-blue-600 hover:bg-slate-900'}`}
              >
                {status === 'loading' ? <Loader2 className="animate-spin" /> : status === 'success' ? <CheckCircle2 /> : <Save size={20} />}
                {status === 'loading' ? 'ĐANG LƯU...' : status === 'success' ? 'ĐÃ CẬP NHẬT THÀNH CÔNG' : 'LƯU THAY ĐỔI'}
              </button>
            </div>
          </>
        ) : (
          <div className="py-32 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/30">
             <Package className="mx-auto text-slate-200 mb-4" size={48} />
             <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Vui lòng chọn đơn hàng bên trên</p>
          </div>
        )}
      </div>
    </div>
  );
}