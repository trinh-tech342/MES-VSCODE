import React from 'react';

interface StatusToggleProps {
  status: boolean | null;
  onStatusChange: (newStatus: boolean) => void;
}

export function StatusToggle({ status, onStatusChange }: StatusToggleProps) {
  return (
    <div className="flex items-center gap-2 bg-slate-200/50 p-1.5 rounded-full relative w-40 h-11 select-none border border-slate-200">
      <button 
        onClick={() => onStatusChange(false)} 
        className={`flex-1 z-10 text-[10px] font-black transition-all ${status === false ? 'text-white' : 'text-slate-500'}`}
      >
        FAIL
      </button>
      <button 
        onClick={() => onStatusChange(true)} 
        className={`flex-1 z-10 text-[10px] font-black transition-all ${status === true ? 'text-white' : 'text-slate-500'}`}
      >
        PASS
      </button>
      <div className={`absolute top-1 bottom-1 w-[47%] rounded-full transition-all duration-500 shadow-lg 
        ${status === null ? 'opacity-0' : 'opacity-100'} 
        ${status === true ? 'left-[51%] bg-emerald-500' : 'left-[2%] bg-rose-500'}`} 
      />
    </div>
  );
}