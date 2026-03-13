"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings } from 'lucide-react';
import SkuSidebar from './../sku_bom/SkuSidebar';
import ProcessEditor from './../sku_bom/ProcessEditor';
import BomManager from './BomManager';

export default function ProcessManager() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedSku, setSelectedSku] = useState<any>(null);
  const [bomData, setBomData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBomLoading, setIsBomLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('sku');
    if (data) setConfigs(data);
    setLoading(false);
  };

  const handleCreateSku = async (newSkuData: any) => {
    setSaving(true);
    try {
      // Khởi tạo sản phẩm mới với cấu trúc JSON an toàn
      const { error: prodError } = await supabase
        .from('products')
        .insert([{ ...newSkuData, bom_details: { KLG: "", TCB: "" } }]);
      
      if (prodError) throw prodError;

      // Khởi tạo quy trình mẫu mặc định
      const { error: procError } = await supabase
        .from('product_process')
        .insert([{ sku: newSkuData.sku, steps: ["Bắt đầu quy trình..."] }]);
      
      if (procError) throw procError;

      alert("Tạo SKU mới thành công!");
      fetchConfigs();
    } catch (error: any) {
      alert("Lỗi tạo SKU: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectProduct = async (product: any) => {
    setIsBomLoading(true);
    try {
      const [processRes, bomRes] = await Promise.all([
        supabase.from('product_process').select('steps').eq('sku', product.sku).maybeSingle(),
        supabase.from('product_bom').select('*').eq('parent_sku', product.sku)
      ]);

      // .maybeSingle() sẽ không báo lỗi nếu không tìm thấy dòng nào
      setSelectedSku({ 
        ...product, 
        steps: processRes.data?.steps || [],
        bom_details: product.bom_details || { KLG: "", TCB: "" }
      });
      setBomData(bomRes.data || []);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu SKU:", error);
    } finally {
      setIsBomLoading(false);
    }
  };

  const handleUpdateAll = async () => {
    if (!selectedSku) return;
    setSaving(true);

    try {
      // 1. Cập nhật thông tin cơ bản
      const updateProd = supabase
        .from('products')
        .update({ 
          product_name: selectedSku.product_name, 
          bom_details: selectedSku.bom_details 
        })
        .eq('sku', selectedSku.sku);

      // 2. UPSERT quy trình (Quan trọng: Giải quyết vấn đề không lưu được khi chưa có dòng)
      const upsertProc = supabase
        .from('product_process')
        .upsert({ 
          sku: selectedSku.sku, 
          steps: selectedSku.steps || [] 
        }, { onConflict: 'sku' });

      // 3. Cập nhật số lượng BOM
      const bomPromises = bomData.map(item => 
        supabase.from('product_bom')
          .update({ quantity: item.quantity })
          .eq('id', item.id)
      );

      const results = await Promise.all([updateProd, upsertProc, ...bomPromises]);
      
      // Kiểm tra xem có lệnh nào bị lỗi không
      const errorResult = results.find(r => r.error);
      if (errorResult) throw errorResult.error;

      alert("Hệ thống đã cập nhật hoàn tất!");
      await fetchConfigs();
    } catch (error: any) {
      console.error("Lưu thất bại:", error);
      alert("Lỗi: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { fetchConfigs(); }, []);

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-black text-slate-400 animate-pulse">
      ĐANG ĐỒNG BỘ...
    </div>
  );

  return (
    <div className="grid grid-cols-12 gap-6 p-6 bg-slate-50 min-h-screen font-sans">
      <SkuSidebar 
        configs={configs} 
        selectedSku={selectedSku} 
        onSelect={handleSelectProduct} 
        onAddSku={handleCreateSku}
        saving={saving}
      />

      <div className="col-span-12 md:col-span-8 space-y-6">
        {selectedSku ? (
          <>
            <ProcessEditor 
              selectedSku={selectedSku} 
              setSelectedSku={setSelectedSku} 
              onUpdate={handleUpdateAll} 
              saving={saving} 
            />
            <BomManager 
              parentSku={selectedSku.sku} 
              bomData={bomData} 
              setBomData={setBomData} 
              isLoading={isBomLoading} 
            />
          </>
        ) : (
          <div className="h-[70vh] flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-[3.5rem] bg-white shadow-inner">
            <Settings size={80} className="opacity-10 animate-[spin_10s_linear_infinite] mb-6" />
            <p className="font-black uppercase tracking-[0.4em] text-[10px] text-slate-400">Chọn một sản phẩm để bắt đầu</p>
          </div>
        )}
      </div>
    </div>
  );
}