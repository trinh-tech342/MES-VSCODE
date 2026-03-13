import React from 'react';

interface StatCardProps {
  label?: string;
  title?: string;
  value: number | string;
  color?: 'orange' | 'rose' | 'emerald' | 'blue' | 'red' | 'green';
  icon: React.ReactNode | any;
  loading?: boolean;
  subText?: string;
  data?: any[]; // Danh sách chi tiết (SKU, Tên, Qty...)
}

const colorStyles: any = {
  orange: 'bg-orange-50 text-orange-600 border-orange-100',
  rose: 'bg-rose-50 text-rose-600 border-rose-100',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  red: 'bg-red-50 text-red-600 border-red-100',
  green: 'bg-green-50 text-green-600 border-green-100',
};

export default function StatCard({ label, title, value, color = 'blue', icon: Icon, loading, subText, data = [] }: StatCardProps) {
  const activeStyle = colorStyles[color] || colorStyles['blue'];
  const bgColorClass = activeStyle.split(' ')[0];

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all flex flex-col h-full">
      <div className={`absolute top-0 right-0 p-4 opacity-20 ${bgColorClass} rounded-bl-[2rem]`}>
        {React.isValidElement(Icon) ? Icon : (typeof Icon === 'function' ? <Icon size={24} /> : null)}
      </div>
      
      <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">
        {label || title}
      </p>

      <div className="flex items-baseline gap-2 mb-4">
        <p className={`text-4xl font-black ${activeStyle.split(' ')[1]}`}>
          {loading ? '...' : value}
        </p>
        <span className="text-[10px] font-bold text-slate-400 uppercase italic">{subText || 'Mục'}</span>
      </div>

      {/* DANH SÁCH CHI TIẾT (Chỉ hiện khi có data) */}
      <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar mt-auto">
        {data.length > 0 ? (
          data.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl border border-slate-100 hover:bg-white transition-colors">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-blue-600 leading-none">{item.id || item.material_sku}</span>
                <span className="text-[10px] font-bold text-slate-700 truncate max-w-[120px]">
                  {item.name || 'Lô hàng'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black block">
                  {item.qty || item.remaining_quantity}
                </span>
                {item.exp_date && (
                  <span className="text-[8px] text-rose-500 font-bold uppercase italic">
                    HSD: {new Date(item.exp_date).toLocaleDateString('vi-VN')}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          !loading && <p className="text-[9px] italic text-slate-400 text-center py-2 border border-dashed rounded-xl">Hệ thống ổn định</p>
        )}
      </div>
    </div>
  );
}