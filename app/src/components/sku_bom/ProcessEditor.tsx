"use client";
import React from 'react';
import { Box, Info, Save, Trash2, Plus } from 'lucide-react';

export default function ProcessEditor({ selectedSku, setSelectedSku, onUpdate, saving }: any) {
  
  // Nếu chưa chọn SKU nào thì không hiển thị gì
  if (!selectedSku) return null;

  // Bảo vệ dữ liệu: Nếu database trả về null cho các trường này, component vẫn không bị crash
  const steps = selectedSku.steps || [];
  const bomDetails = selectedSku.bom_details || { KLG: "", TCB: "" };

  // Cập nhật nội dung của một bước cụ thể
  const updateStepText = (index: number, text: string) => {
    const newSteps = [...steps];
    newSteps[index] = text;
    setSelectedSku({ ...selectedSku, steps: newSteps });
  };

  // Xóa một bước khỏi danh sách
  const removeStep = (index: number) => {
    const newSteps = steps.filter((_: any, i: number) => i !== index);
    setSelectedSku({ ...selectedSku, steps: newSteps });
  };

  // Thêm bước mới vào cuối danh sách
  const addStep = () => {
    const newSteps = [...steps, "Bước quy trình mới..."];
    setSelectedSku({ ...selectedSku, steps: newSteps });
  };

  // Cập nhật thông số KLG hoặc TCB
  const updateBomDetail = (key: string, value: string) => {
    setSelectedSku({
      ...selectedSku,
      bom_details: { ...bomDetails, [key]: value }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. THÔNG SỐ KỸ THUẬT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Khối lượng tịnh */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 rounded-2xl text-orange-500"><Box size={24} /></div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase">Khối lượng tịnh</p>
            <input 
              className="w-full font-black text-slate-700 outline-none text-lg bg-transparent" 
              value={bomDetails.KLG || ''} 
              onChange={(e) => updateBomDetail('KLG', e.target.value)}
              placeholder="Nhập khối lượng..."
            />
          </div>
        </div>

        {/* Số tự công bố */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-500"><Info size={24} /></div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase">Số tự công bố</p>
            <input 
              className="w-full font-black text-slate-700 outline-none text-lg bg-transparent" 
              value={bomDetails.TCB || ''} 
              onChange={(e) => updateBomDetail('TCB', e.target.value)}
              placeholder="Nhập số TCB..."
            />
          </div>
        </div>
      </div>

      {/* 2. DANH SÁCH BƯỚC CÔNG ĐOẠN */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-blue-500 font-black text-[10px] uppercase mb-1">Cấu hình quy trình</p>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">
              {selectedSku.product_name}
            </h2>
          </div>
          
          <button 
            onClick={onUpdate} 
            disabled={saving} 
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs hover:bg-emerald-600 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            LƯU HỆ THỐNG
          </button>
        </div>
        
        {/* Render danh sách các bước */}
        <div className="space-y-3 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-100">
          {steps.map((step: string, i: number) => (
            <div key={i} className="flex items-center gap-4 bg-white hover:bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-all group relative z-10">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shrink-0">
                {i + 1}
              </div>
              <input 
                value={step} 
                onChange={(e) => updateStepText(i, e.target.value)}
                className="flex-1 bg-transparent border-none outline-none font-bold text-slate-600 text-sm focus:text-blue-600"
              />
              <button 
                onClick={() => removeStep(i)}
                className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          
          {/* Nút thêm bước */}
          <button 
            onClick={addStep}
            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-[10px] uppercase tracking-widest hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2 mt-4 bg-white"
          >
            <Plus size={14} /> Thêm bước thực hiện
          </button>
        </div>
      </div>
    </div>
  );
}