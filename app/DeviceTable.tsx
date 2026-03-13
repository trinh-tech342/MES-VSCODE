"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from './src/lib/supabase';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function DeviceTable() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCriticalDevices = async () => {
    const { data, error } = await supabase
      .from('equipment_management')
      .select('*')
      .or('status.eq.BROKEN,status.eq.MAINTENANCE') // Ưu tiên máy hỏng
      .limit(5); // Chỉ hiện 5 máy quan trọng nhất ở trang chủ

    if (!error && data) setDevices(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCriticalDevices();
    
    // Đăng ký realtime để bảng tự cập nhật khi Manager sửa ở Tab Bảo trì
    const channel = supabase.channel('table-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_management' }, fetchCriticalDevices)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return <div className="p-8 text-center text-xs font-bold text-slate-400 animate-pulse uppercase">Đang tải danh sách thiết bị...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-50/50">
          <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <th className="px-6 py-4">Thiết bị</th>
            <th className="px-6 py-4">Vị trí</th>
            <th className="px-6 py-4">Trạng thái</th>
            <th className="px-6 py-4">Bảo trì kế tiếp</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {devices.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-10 text-center text-xs font-bold text-emerald-500 uppercase">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} /> Toàn bộ hệ thống đang vận hành ổn định
                </div>
              </td>
            </tr>
          ) : (
            devices.map((device) => (
              <tr key={device.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-700 text-xs">{device.device_name}</div>
                  <div className="text-[10px] text-slate-400 font-mono uppercase">{device.device_code}</div>
                </td>
                <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                  {device.location}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                    device.status === 'BROKEN' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {device.status === 'BROKEN' ? 'Hỏng nặng' : 'Đang bảo trì'}
                  </span>
                </td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                     <Clock size={12} className="text-slate-400" />
                     {device.next_maintenance ? new Date(device.next_maintenance).toLocaleDateString('vi-VN') : '---'}
                   </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}