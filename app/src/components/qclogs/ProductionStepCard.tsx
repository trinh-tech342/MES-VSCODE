"use client";
import React from 'react';
import { Play, CheckCircle, MapPin, MessageSquare } from 'lucide-react';

const FACTORY_LOCATIONS = ["TẦNG TRÀ PCT", "TẦNG CAO PCT", "TẦNG ĐẶC SẢN PCT", "KHO TP", "KHO PCT", "XƯỞNG CAO TP"];

export default function ProductionStepCard({ step, batchId, isFirst, prevStepDone, onUpdateStatus, onUpdateDetails, onOpenQC }: any) {
  const isRunning = step.status === 'RUNNING';
  const isDone = step.status === 'COMPLETED';
  const canStart = isFirst || prevStepDone;

  return (
    <div className="flex flex-col items-center min-w-[170px]">
      <button 
        onClick={() => onUpdateStatus(batchId, step.id, step.status)}
        disabled={isDone || !canStart}
        className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all shadow-sm active:scale-90
          ${isDone ? 'bg-emerald-500 text-white' : isRunning ? 'bg-orange-500 text-white animate-pulse' : 'bg-white border-2 border-slate-100 text-slate-200'}
          ${!canStart && 'opacity-30'}`}
      >
        {isDone ? <CheckCircle size={24}/> : <Play size={20} fill="currentColor"/>}
      </button>

      <span className={`text-[10px] font-black uppercase mt-3 text-center h-8 line-clamp-2 px-2 ${isRunning ? 'text-orange-600' : isDone ? 'text-emerald-600' : 'text-slate-400'}`}>
        {step.step_name}
      </span>

      {(isRunning || isDone) && (
        <div className="w-full mt-3 space-y-1.5 animate-in fade-in slide-in-from-top-2">
          <select 
            disabled={isDone}
            value={step.location || ''}
            onChange={(e) => onUpdateDetails(batchId, step.id, 'location', e.target.value)}
            className="w-full px-2 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-bold outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Vị trí...</option>
            {FACTORY_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>

          <textarea 
            disabled={isDone}
            placeholder="Ghi chú..."
            value={step.notes || ''}
            onChange={(e) => onUpdateDetails(batchId, step.id, 'notes', e.target.value, true)} // true để báo là đang gõ (chỉ update local)
            onBlur={(e) => onUpdateDetails(batchId, step.id, 'notes', e.target.value)} // Lưu DB khi rời ô
            className="w-full px-2 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] min-h-[50px] resize-none outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      <button 
        onClick={() => onOpenQC(step)} 
        className="mt-3 w-full py-2 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-xl hover:bg-indigo-100 transition-colors uppercase"
      >
        Ghi chép QC
      </button>
    </div>
  );
}