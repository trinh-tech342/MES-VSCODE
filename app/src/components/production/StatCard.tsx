"use client";
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'red' | 'emerald' | 'orange';
}

export default function StatCard({ title, value, icon, color }: StatCardProps) {
  // Map màu sắc để code sạch hơn
  const styles = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    red: "bg-red-50 text-red-600 border-red-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  };

  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
      <div className={`p-4 rounded-3xl ${styles[color]} border`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
          {title}
        </p>
        <p className="text-2xl font-black text-slate-800 tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}