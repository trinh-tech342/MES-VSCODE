import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricProps {
  icon: LucideIcon;
  label: string;
  status: string;
  color: 'emerald' | 'orange' | 'indigo' | 'blue';
}

export function MetricSmallCard({ icon: Icon, label, status, color }: MetricProps) {
  const colorMap = {
    emerald: "text-emerald-500 bg-emerald-50 border-emerald-100",
    orange: "text-orange-500 bg-orange-50 border-orange-100",
    indigo: "text-indigo-500 bg-indigo-50 border-indigo-100",
    blue: "text-blue-500 bg-blue-50 border-blue-100"
  };

  return (
    <div className="p-5 bg-white rounded-3xl border border-slate-100 flex flex-col items-center gap-3 shadow-sm hover:shadow-md transition-all">
      <div className={`p-3 rounded-2xl ${colorMap[color].split(' ').slice(1).join(' ')} shadow-inner`}>
        <Icon size={20} className={colorMap[color].split(' ')[0]} />
      </div>
      <div className="text-center">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <span className="text-sm font-black text-slate-800 italic uppercase">{status}</span>
      </div>
    </div>
  );
}