"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Calendar, Sparkles, TestTube, ClipboardCheck, 
  Clock, CheckCircle2, Plus, X, User, Tag, FileText,
  Filter, CalendarDays, CalendarRange, History, Loader2
} from 'lucide-react';

export default function ComplianceTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, WEEK, DONE
  
  const [formData, setFormData] = useState({
    title: '', category: 'CLEANING', planned_date: '', assignee: ''
  });

  // 1. Hàm lấy dữ liệu với bộ lọc trạng thái thông minh
  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('compliance_schedule').select('*').order('planned_date', { ascending: true });

      // Nếu là tab 'DONE' thì hiện COMPLETED, ngược lại chỉ hiện PENDING
      if (dateFilter === 'DONE') {
        query = query.eq('status', 'COMPLETED');
      } else {
        query = query.eq('status', 'PENDING');
      }

      // Logic lọc theo mốc thời gian
      const today = new Date().toISOString().split('T')[0];
      if (dateFilter === 'TODAY') {
        query = query.eq('planned_date', today);
      } else if (dateFilter === 'WEEK') {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        query = query.gte('planned_date', today).lte('planned_date', nextWeek.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Lỗi tải lịch trình:", error);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => { 
    fetchSchedule(); 
  }, [fetchSchedule]);

  // 2. Xử lý thêm mới
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('compliance_schedule').insert([formData]);
    if (!error) {
      setIsModalOpen(false);
      setFormData({ title: '', category: 'CLEANING', planned_date: '', assignee: '' });
      fetchSchedule();
    }
  };

  // 3. Xử lý chuyển trạng thái (Click để hoàn thành -> Sẽ biến mất ngay)
  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PENDING' ? 'COMPLETED' : 'PENDING';
    const { error } = await supabase
      .from('compliance_schedule')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (!error) {
      // Refresh lại danh sách để nhiệm vụ vừa xong biến mất (do filter PENDING)
      fetchSchedule();
    }
  };

  return (
    <div className="space-y-6">
      {/* TOOLBAR: Bộ lọc & Nút thêm */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-x-auto max-w-full">
          {[
            { id: 'ALL', label: 'Tất cả', icon: CalendarRange },
            { id: 'TODAY', label: 'Hôm nay', icon: CalendarDays },
            { id: 'WEEK', label: '7 ngày tới', icon: Filter },
            { id: 'DONE', label: 'Lịch sử đã xong', icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDateFilter(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                dateFilter === tab.id ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase shadow-lg shadow-blue-100 transition-all active:scale-95"
        >
          <Plus size={18} /> Lập kế hoạch mới
        </button>
      </div>

      {/* GRID DANH SÁCH THEO CỘT */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40}/></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['CLEANING', 'TESTING', 'AUDIT'].map((cat) => {
            const categoryEvents = events.filter(e => e.category === cat);
            return (
              <div key={cat} className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm flex flex-col min-h-[500px]">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                  <h3 className="font-black text-slate-800 uppercase text-[11px] flex items-center gap-2">
                     {cat === 'CLEANING' ? <Sparkles className="text-emerald-500" size={18}/> : cat === 'TESTING' ? <TestTube className="text-blue-500" size={18}/> : <ClipboardCheck className="text-purple-500" size={18}/>}
                     {cat === 'CLEANING' ? 'Vệ sinh' : cat === 'TESTING' ? 'Kiểm nghiệm' : 'Đánh giá'}
                  </h3>
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-lg">{categoryEvents.length}</span>
                </div>
                
                <div className="space-y-3 flex-1">
                  {categoryEvents.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 text-center">
                      <Calendar size={40} />
                      <p className="text-[10px] font-black uppercase mt-2">
                        {dateFilter === 'DONE' ? 'Chưa có lịch sử' : 'Không có việc cần làm'}
                      </p>
                    </div>
                  ) : (
                    categoryEvents.map((event) => (
                      <div 
                        key={event.id} 
                        onClick={() => toggleStatus(event.id, event.status)}
                        className={`group cursor-pointer p-4 rounded-2xl border-2 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
                          event.status === 'COMPLETED' 
                            ? 'bg-emerald-50/20 border-emerald-100 opacity-80' 
                            : 'bg-slate-50 border-transparent hover:border-blue-200 hover:bg-white hover:shadow-md'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${event.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                              {new Date(event.planned_date).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          {event.status === 'COMPLETED' ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-slate-200 rounded-full group-hover:border-blue-400 transition-colors" />
                          )}
                        </div>
                        <div className={`font-bold text-xs leading-tight ${event.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {event.title}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                           <span className="text-[9px] font-black text-slate-500 flex items-center gap-1">
                             <User size={10}/> {event.assignee}
                           </span>
                           {event.status === 'PENDING' && (
                             <span className="text-[8px] font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase">Bấm để xong</span>
                           )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL THÊM KẾ HOẠCH */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase text-sm tracking-tight italic">Tạo kế hoạch tuân thủ</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-all active:scale-90 p-1"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2"><FileText size={12}/> Tên nhiệm vụ</label>
                <input required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" placeholder="Ví dụ: Kiểm tra nhiệt độ kho" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2"><Tag size={12}/> Phân loại</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                    <option value="CLEANING">Vệ sinh</option>
                    <option value="TESTING">Kiểm nghiệm</option>
                    <option value="AUDIT">Đánh giá</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2"><Calendar size={12}/> Ngày thực hiện</label>
                  <input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" value={formData.planned_date} onChange={(e) => setFormData({...formData, planned_date: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2"><User size={12}/> Người phụ trách</label>
                <input required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" placeholder="Tên nhân viên phụ trách" value={formData.assignee} onChange={(e) => setFormData({...formData, assignee: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black uppercase text-xs py-5 rounded-2xl shadow-lg mt-4 transition-all active:scale-95">Lưu vào hệ thống</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}