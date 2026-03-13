"use client";
import React from 'react';
import { Warehouse, ArrowRight, Loader2 } from 'lucide-react';

interface BatchItemProps {
  batch: any;
  onSelect: (batch: any) => void;
  onInbound: (batch: any) => void;
  isProcessing: boolean;
}

export default function BatchItem({ batch, onSelect, onInbound, isProcessing }: BatchItemProps) {
  // Logic tính toán tiến độ
  const totalSteps = batch.production_steps?.length || 0;
  const completedSteps = batch.production_steps?.filter((s: any) => s.status === 'COMPLETED').length || 0;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const isFinished = progress === 100;

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
      {/* Khu vực thông tin bên trái */}
      <div 
        className="flex items-center gap-6 cursor-pointer flex-1" 
        onClick={() => onSelect(batch)}
      >
        {/* Vòng tròn phần trăm */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner transition-colors ${
          isFinished ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
        }`}>
          {Math.round(progress)}%
        </div>
        
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h4 className="font-black text-slate-800 text-xl leading-none">{batch.batch_id}</h4>
            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-black border border-slate-200 uppercase">
              ĐH: {batch.order_number || 'N/A'}
            </span>
          </div>
          
          <div className="mt-2">
            <p className="text-sm font-black text-indigo-600 uppercase tracking-tight mb-1">
              {batch.product_name || 'Sản phẩm không xác định'}
            </p>
            <div className="flex items-center gap-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                SKU: {batch.sku} | SL: {batch.planned_qty}
              </p>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <p className="text-[10px] font-bold text-indigo-500 uppercase">
                {completedSteps}/{totalSteps} CÔNG ĐOẠN
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Khu vực nút bấm bên phải */}
      <div className="flex items-center gap-3">
        {isFinished && (
          <button 
            onClick={(e) => { e.stopPropagation(); onInbound(batch); }}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-700 shadow-lg hover:shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={14}/> : <Warehouse size={14} />} 
            Nhập kho
          </button>
        )}
        <button 
          onClick={() => onSelect(batch)} 
          className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"
        >
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}