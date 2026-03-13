"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, CheckCircle, User, Calendar } from 'lucide-react';
import Select from 'react-select';
import { supabase } from '../../lib/supabase';

// Định nghĩa cấu trúc dòng sản phẩm
interface ProductRow {
  tempId: number;
  sku: string;
  product_name: string;
  specification: string;
  quantity: string;
  unit: string;
}

export default function OrderForm() {
  // 1. Quản lý State
  const [orderInfo, setOrderInfo] = useState({ customer: '', deadline: '' });
  const [rows, setRows] = useState<ProductRow[]>([
    { tempId: Date.now(), sku: '', product_name: '', specification: '', quantity: '', unit: 'kg' }
  ]);
  const [productList, setProductList] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  // 2. Lấy danh sách sản phẩm từ DB khi load trang
  useEffect(() => {
    const getProducts = async () => {
      const { data } = await supabase.from('products').select('*');
      if (data) setProductList(data);
    };
    getProducts();
  }, []);

  // Chuyển đổi danh sách sản phẩm sang định dạng của react-select
  const productOptions = productList.map(p => ({
    value: p.product_name,
    label: p.product_name,
    sku: p.sku,
    specification: p.specification,
    unit: p.unit
  }));

  // 3. Hàm thêm dòng mới
  const addRow = () => {
    setRows(prev => [...prev, { 
      tempId: Date.now() + Math.random(), 
      sku: '', 
      product_name: '', 
      specification: '', 
      quantity: '', 
      unit: 'kg' 
    }]);
  };

  // 4. Cập nhật dữ liệu từng dòng
  const updateRow = (id: number, field: keyof ProductRow, value: any) => {
    setRows(prevRows => prevRows.map(row => {
      if (row.tempId === id) {
        if (field === 'product_name') {
          // Khi chọn từ Search Select
          return {
            ...row,
            product_name: value?.value || '',
            sku: value?.sku || '',
            specification: value?.specification || row.specification,
            unit: value?.unit || row.unit
          };
        }
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  // 5. Hàm lưu vào Database (Fix lỗi handleSaveAll is not defined)
  const handleSaveAll = async () => {
    if (!orderInfo.customer) return alert("Vui lòng nhập tên khách hàng!");
    if (rows.length === 0) return alert("Vui lòng thêm ít nhất một sản phẩm!");
    if (rows.some(r => !r.sku)) return alert("Một số sản phẩm chưa có mã SKU. Vui lòng chọn lại!");

    setStatus('loading');
    try {
      // BƯỚC 1: Lưu bảng cha 'orders'
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{ 
          customer: orderInfo.customer, 
          deadline: orderInfo.deadline || null 
        }])
        .select().single();

      if (orderError) throw orderError;

      // BƯỚC 2: Lưu bảng con 'order_items'
      const itemsToSave = rows.map(row => ({
        order_id: orderData.id,
        sku: row.sku,
        product_name: row.product_name,
        specification: row.specification,
        quantity: parseInt(row.quantity) || 0,
        unit: row.unit
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(itemsToSave);
      if (itemsError) throw itemsError;

      // THÀNH CÔNG
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setRows([{ tempId: Date.now(), sku: '', product_name: '', specification: '', quantity: '', unit: 'kg' }]);
        setOrderInfo({ customer: '', deadline: '' });
      }, 2000);
    } catch (err: any) {
      alert("Lỗi: " + err.message);
      setStatus('idle');
    }
  };

  // Style cho Search Select
  const customSelectStyles = {
    control: (base: any) => ({
      ...base,
      padding: '4px',
      borderRadius: '1rem',
      border: '2px solid #f1f5f9',
      boxShadow: 'none',
      '&:hover': { borderColor: '#3b82f6' }
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? '#eff6ff' : 'white',
      color: state.isFocused ? '#2563eb' : '#475569',
      fontWeight: '600'
    })
  };

  return (
    <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-2xl max-w-6xl mx-auto">
      {/* THÔNG TIN CHUNG */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Khách hàng</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
            <input
              type="text"
              placeholder="Tên khách hàng..."
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
              value={orderInfo.customer}
              onChange={(e) => setOrderInfo({ ...orderInfo, customer: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Hạn giao dự kiến</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
            <input
              type="date"
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700"
              value={orderInfo.deadline}
              onChange={(e) => setOrderInfo({ ...orderInfo, deadline: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* DANH SÁCH SẢN PHẨM */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] uppercase text-slate-400 font-black tracking-widest border-b border-slate-100">
              <th className="py-4 px-3">Sản phẩm</th>
              <th className="py-4 px-3 w-64">Quy cách</th>
              <th className="py-4 px-3 w-28 text-center">Số lượng</th>
              <th className="py-4 px-3 w-32">Đơn vị</th>
              <th className="py-4 px-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.tempId} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-2 min-w-[300px]">
                <Select
                  options={productOptions}
                  placeholder="Tìm sản phẩm..."
                  styles={customSelectStyles}
                  value={productOptions.find(opt => opt.value === row.product_name) || null}
                  onChange={(selected) => updateRow(row.tempId, 'product_name', selected)}
                  isSearchable
                  isClearable
                  // Thêm 2 dòng dưới đây:
                  menuPortalTarget={typeof window !== "undefined" ? document.body : null} 
                  menuPosition={'fixed'} 
                />
                  {row.sku && <span className="text-[9px] font-bold text-slate-300 ml-2 mt-1 block italic uppercase tracking-tighter">Mã: {row.sku}</span>}
                </td>
                <td className="py-4 px-2">
                  <input
                    type="text"
                    value={row.specification}
                    onChange={(e) => updateRow(row.tempId, 'specification', e.target.value)}
                    className="w-full p-3 bg-slate-50/50 rounded-xl text-sm outline-none border border-transparent focus:border-slate-200"
                    placeholder="GÓI 200G"
                  />
                </td>
                <td className="py-4 px-2">
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.tempId, 'quantity', e.target.value)}
                    className="w-full p-3 bg-transparent text-sm font-black text-center outline-none"
                    placeholder="0"
                  />
                </td>
                <td className="py-4 px-2">
                  <select
                    value={row.unit}
                    onChange={(e) => updateRow(row.tempId, 'unit', e.target.value)}
                    className="w-full p-3 bg-slate-100/50 rounded-xl text-[10px] font-black uppercase outline-none"
                  >
                    <option value="kg">kg</option>
                    <option value="gói">gói</option>
                    <option value="hũ">hũ</option>
                    <option value="hộp">hộp</option>
                  </select>
                </td>
                <td className="py-4 px-2">
                  <button 
                    onClick={() => setRows(prev => prev.filter(r => r.tempId !== row.tempId))} 
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex gap-4">
        <button 
          type="button" 
          onClick={addRow} 
          className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Thêm sản phẩm
        </button>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={status === 'loading'}
          className={`flex-[2] py-4 rounded-2xl font-black text-white shadow-lg transition-all flex items-center justify-center gap-3
            ${status === 'success' ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-slate-900'}
            ${status === 'loading' ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {status === 'loading' ? <Loader2 className="animate-spin" /> : status === 'success' ? <CheckCircle /> : null}
          {status === 'loading' ? 'Đang tạo đơn hàng...' : status === 'success' ? 'Đã lưu thành công!' : 'XÁC NHẬN LỆNH SẢN XUẤT'}
        </button>
      </div>
    </div>
  );
}