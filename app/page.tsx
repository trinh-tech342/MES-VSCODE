"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './src/lib/supabase';
import Sidebar from './Sidebar';

// --- IMPORTS COMPONENTS ---
import StatCard from './src/components/warehouse/StatCard';
import DeviceTable from './DeviceTable';
import OrderForm from './src/components/order/OrderForm';
import OrderList from './src/components/order/OrderList';
import ProductionTab from './src/components/production/ProductionTab';
import WarehouseTab from './src/components/warehouse/WarehouseTab'; 
import QCTab from './src/components/qclogs/QCTab';
import ProcessManager from './src/components/sku_bom/ProcessManager';
import EquipmentTab from './src/components/maintenance/EquipmentTab';
import ComplianceTab from './src/components/dashboard/ComplianceTab';

// Icons
import { 
  ShoppingCart, AlertTriangle, PackageCheck, 
  Wrench, CalendarCheck, Bell, ShieldAlert 
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalBatches: 0,
    qcPendingBatches: 0,
    brokenDevices: 0,
    todayTasks: 0,
    defectAlerts: 0 
  });

  // CẬP NHẬT: Lấy 20 tin gần nhất để giữ log trong state, nhưng UI sẽ lọc lại
  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) setNotifications(data);
  };

  const fetchDashboardStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [ordersRes, batchesRes, devicesRes, tasksRes, defectsRes] = await Promise.all([
        supabase.from('orders').select('id, status'),
        supabase.from('batches').select('id, status'),
        supabase.from('equipment_management').select('id, status, calibration_due_date'),
        supabase.from('compliance_schedule').select('id').eq('planned_date', today).eq('status', 'PENDING'),
        supabase.from('defect_logs').select('id', { count: 'exact', head: true }).gt('total_defects', 0)
      ]);

      const now = new Date();

      setStats({
        totalOrders: ordersRes.data?.filter(o => o.status !== 'Hoàn tất').length || 0,
        pendingOrders: ordersRes.data?.filter(o => 
          o.status === 'Chờ duyệt' || o.status === 'Pending'
        ).length || 0,
        totalBatches: batchesRes.data?.filter(b => b.status !== 'Completed').length || 0,
        qcPendingBatches: batchesRes.data?.filter(b => 
          b.status === 'Pending' || b.status === 'Running'
        ).length || 0,
        brokenDevices: devicesRes.data?.filter(d => 
          d.status === 'BROKEN' || 
          d.status === 'MAINTENANCE' || 
          (d.calibration_due_date && new Date(d.calibration_due_date) < now)
        ).length || 0,
        todayTasks: tasksRes.data?.length || 0,
        defectAlerts: defectsRes.count || 0 
      });
    } catch (error) {
      console.error("Lỗi tải stats:", error);
    }
  }, []);

  const markAsRead = async (id: string) => {
    // Cập nhật Database: Chuyển is_read thành true (vẫn lưu vết, không xóa)
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    fetchNotifications();
  };

  useEffect(() => {
    setMounted(true);
    fetchDashboardStats();
    fetchNotifications();
    
    const channel = supabase.channel('system-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchDashboardStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, fetchDashboardStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'defect_logs' }, fetchDashboardStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_management' }, fetchDashboardStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchDashboardStats]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'ĐƠN HÀNG': return <div className="space-y-6"><OrderForm /><OrderList /></div>;
      case 'SẢN XUẤT': return <ProductionTab />;
      case 'KHO VẬN': return <WarehouseTab />;
      case 'QC': return <QCTab />;
      case 'CẤU HÌNH': return <ProcessManager />;
      case 'BẢO TRÌ': return <EquipmentTab />;
      case 'KẾ HOẠCH': return <ComplianceTab />;
      default: return <DashboardHome stats={stats} onNavigate={setActiveTab} />;
    }
  };

  if (!mounted) return null;

  // Lọc lấy các thông báo chưa đọc để hiển thị số lượng trên Badge
  const unreadNotifications = notifications.filter(n => !n.is_read);

  return (
    <main className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar onTabChange={setActiveTab} activeTab={activeTab} />
      <div className="flex-1 p-8 overflow-y-auto h-screen">
        <header className="mb-10 flex justify-between items-start border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
              {activeTab === 'DASHBOARD' ? 'Điều hành sản xuất' : activeTab}
            </h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mt-1">
              Hệ thống quản trị thời gian thực
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <div 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-xl border transition-all cursor-pointer shadow-sm ${
                  showNotifications ? 'bg-slate-100 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Bell size={20} className={showNotifications ? 'text-blue-600' : 'text-slate-600'} />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#F8FAFC] animate-bounce">
                    {unreadNotifications.length}
                  </span>
                )}
              </div>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 italic">Thông báo mới</h4>
                        <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                          <AlertTriangle size={14} className="rotate-180" />
                        </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {unreadNotifications.length === 0 ? (
                        <div className="p-10 text-center">
                          <PackageCheck size={32} className="mx-auto text-slate-200 mb-2" />
                          <p className="text-xs text-slate-400 italic">Tất cả đã được xử lý</p>
                        </div>
                      ) : (
                        unreadNotifications.map(n => (
                          <div key={n.id} className="p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors bg-blue-50/10">
                            <div className="flex items-start gap-3">
                              <div className={`p-1.5 rounded-lg mt-0.5 ${
                                n.type === 'error' || n.message.includes('CẢNH BÁO') ? 'bg-rose-100 text-rose-600' : 
                                n.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                              }`}>
                                {n.type === 'error' ? <ShieldAlert size={12} /> : <Bell size={12} />}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <p className="text-[10px] font-black uppercase text-slate-800 mb-0.5">{n.title || 'Thông báo'}</p>
                                    {n.sku && <span className="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-500">{n.sku}</span>}
                                </div>
                                <p className="text-[11px] leading-relaxed font-bold text-slate-700">
                                  {n.message}
                                </p>
                                <div className="flex justify-between items-center mt-2">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">{new Date(n.created_at).toLocaleTimeString('vi-VN')}</span>
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }} 
                                      className="text-[9px] font-black text-blue-600 uppercase hover:underline p-1"
                                  >
                                      Đã đọc
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {/* Phần chân trang để xem lại Log cũ */}
                    <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                         Hệ thống lưu trữ {notifications.length} bản ghi gần nhất
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="text-right border-l pl-6 border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái Server</div>
              <div className="text-sm font-mono font-black text-emerald-500 flex items-center gap-2 justify-end">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                ONLINE
              </div>
            </div>
          </div>
        </header>
        
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-700">
          {renderTabContent()}
        </div>
      </div>
    </main>
  );
}

// --- DASHBOARD HOME ---
function DashboardHome({ stats, onNavigate }: { stats: any, onNavigate: any }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          title="Đơn hàng" 
          value={stats.pendingOrders.toLocaleString()} 
          subText={`Tổng hồ sơ: ${stats.totalOrders}`} 
          icon={ShoppingCart} 
          color="blue" 
        />
        <StatCard 
          title="Lô sản xuất" 
          value={`${stats.qcPendingBatches} Lô`} 
          subText={`Tổng lưu trữ: ${stats.totalBatches}`} 
          icon={PackageCheck} 
          color="orange" 
        />
        <div onClick={() => onNavigate('QC')} className="cursor-pointer group">
          <StatCard title="Cảnh báo QC" value={`${stats.defectAlerts} Lô`} subText={stats.defectAlerts > 0 ? "Phát hiện lỗi cần xử lý" : "Chất lượng ổn định"} icon={ShieldAlert} color={stats.defectAlerts > 0 ? "red" : "emerald"} />
        </div>
        <StatCard title="Thiết bị lỗi" value={`${stats.brokenDevices} Máy`} subText="Cần sửa chữa gấp" icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 p-2 shadow-sm">
          <div className="p-4 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-black text-slate-800 uppercase text-[11px] flex items-center gap-2">
              <Wrench size={16} className="text-blue-500" /> Giám sát máy móc thiết bị
            </h3>
            <button onClick={() => onNavigate('BẢO TRÌ')} className="text-[10px] font-black text-blue-600 hover:underline uppercase">Tất cả</button>
          </div>
          <DeviceTable />
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <CalendarCheck className="text-emerald-400 mb-4" size={32} />
            <h3 className="text-2xl font-black italic uppercase leading-tight">Kế hoạch<br/>Hôm nay</h3>
            <div className="mt-8 space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-[10px] font-bold text-white/50 uppercase">Nhiệm vụ</span>
                <span className="text-xl font-black text-emerald-400">{stats.todayTasks}</span>
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed uppercase font-bold">Hoàn thành các nhiệm vụ tuân thủ ISO/GMP.</p>
            </div>
            <button 
              onClick={() => onNavigate('KẾ HOẠCH')}
              className="w-full mt-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase transition-all"
            >
              Xem danh sách việc
            </button>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  );
}