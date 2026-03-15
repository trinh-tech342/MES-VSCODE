"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './src/lib/supabase';
import Sidebar from './Sidebar';

// --- IMPORTS COMPONENTS ---
import StatCard from './src/components/warehouse/StatCard';
import DeviceTable from './DeviceTable';
import OrderForm from './src/components/order/OrderForm';
import OrderList from './src/components/order/OrderList';
import OrderEditForm from './src/components/order/OrderEditForm';
import ProductionTab from './src/components/production/ProductionTab';
import WarehouseTab from './src/components/warehouse/WarehouseTab';
import QCTab from './src/components/qclogs/QCTab';
import ProcessManager from './src/components/sku_bom/ProcessManager';
import EquipmentTab from './src/components/maintenance/EquipmentTab';
import ComplianceTab from './src/components/dashboard/ComplianceTab';

// Icons
import {
  ShoppingCart, AlertTriangle, PackageCheck,
  Wrench, CalendarCheck, Bell, ShieldAlert, Menu, X,
  PlusCircle, ListIcon, Edit3
} from 'lucide-react';

// --- HELPER FUNCTIONS (Định nghĩa ngoài để tránh lỗi Scope) ---
const checkStatus = (current: string | null | undefined, target: string) => {
  if (!current) return false;
  return current.toString().toUpperCase() === target.toUpperCase();
};

export default function Home() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [orderSubTab, setOrderSubTab] = useState<'LIST' | 'CREATE' | 'EDIT'>('LIST');
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalBatches: 0,
    qcPendingBatches: 0,
    brokenDevices: 0,
    todayTasks: 0,
    defectAlerts: 0
  });

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
      const now = new Date();

      const [ordersRes, batchesRes, devicesRes, tasksRes, defectsRes] = await Promise.all([
        supabase.from('orders').select('id, status'),
        supabase.from('batches').select('id, status'),
        supabase.from('equipment_management').select('id, status, calibration_due_date'),
        supabase.from('compliance_schedule').select('id').eq('planned_date', today).eq('status', 'PENDING'),
        supabase.from('defect_logs').select('id', { count: 'exact', head: true }).gt('total_defects', 0)
      ]);

      setStats({
        // Tổng đơn: Loại bỏ các trạng thái kết thúc
        totalOrders: ordersRes.data?.filter(o => 
          !['COMPLETED', 'CANCELLED', 'HOÀN TẤT'].includes(o.status?.toUpperCase())
        ).length || 0,

        // Đơn chờ duyệt
        pendingOrders: ordersRes.data?.filter(o => 
          checkStatus(o.status, 'WAITING') || 
          checkStatus(o.status, 'PENDING') || 
          checkStatus(o.status, 'Chờ duyệt')
        ).length || 0,

        // Lô sản xuất đang chạy
        totalBatches: batchesRes.data?.filter(b => 
          !['COMPLETED', 'CANCELLED'].includes(b.status?.toUpperCase())
        ).length || 0,

        // Lô cần xử lý/QC
        qcPendingBatches: batchesRes.data?.filter(b => 
          checkStatus(b.status, 'PENDING') || checkStatus(b.status, 'RUNNING')
        ).length || 0,

        // Thiết bị lỗi hoặc quá hạn hiệu chuẩn
        brokenDevices: devicesRes.data?.filter(d => 
          d.status === 'BROKEN' || 
          d.status === 'MAINTENANCE' || 
          (d.calibration_due_date && new Date(d.calibration_due_date) < now)
        ).length || 0,

        todayTasks: tasksRes.data?.length || 0,
        defectAlerts: defectsRes.count || 0
      });
    } catch (error) {
      console.error("Lỗi fetch dashboard:", error);
    }
  }, []);

  const markAsRead = async (id: string) => {
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchNotifications)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchDashboardStats]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'ĐƠN HÀNG': 
        return (
          <div className="space-y-6">
            <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-fit gap-2">
              {[
                { id: 'LIST', label: 'Danh sách đơn', icon: ListIcon },
                { id: 'CREATE', label: 'Tạo đơn mới', icon: PlusCircle },
                { id: 'EDIT', label: 'Sửa & Gộp đơn', icon: Edit3 },
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setOrderSubTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black tracking-tighter uppercase transition-all duration-200 ${
                    orderSubTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon size={14}/> {tab.label}
                </button>
              ))}
            </div>

            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              {orderSubTab === 'LIST' && <OrderList />}
              {orderSubTab === 'CREATE' && <OrderForm />}
              {orderSubTab === 'EDIT' && <OrderEditForm />}
            </div>
          </div>
        );
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
  const unreadNotifications = notifications.filter(n => !n.is_read);

  return (
    <main className="flex min-h-screen bg-[#F8FAFC] relative overflow-x-hidden font-sans">
      {/* 1. SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out bg-white md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab: string) => {
            setActiveTab(tab);
            setIsSidebarOpen(false);
          }}
        />
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* 2. MAIN CONTENT */}
      <div className="flex-1 p-4 md:p-8 h-screen overflow-y-auto w-full">
        <header className="mb-6 md:mb-10 flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white border border-slate-200 rounded-xl md:hidden text-slate-600 shadow-sm transition-colors hover:bg-slate-50">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">
                {activeTab === 'DASHBOARD' ? 'Điều hành sản xuất' : activeTab}
              </h1>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">
                {activeTab === 'ĐƠN HÀNG' ? `Kinh doanh > ${orderSubTab}` : 'Hệ thống quản trị thời gian thực'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <div onClick={() => setShowNotifications(!showNotifications)} className={`p-2 rounded-xl border transition-all cursor-pointer relative ${showNotifications ? 'bg-slate-100' : 'bg-white shadow-sm'}`}>
                <Bell size={20} />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full animate-bounce">
                    {unreadNotifications.length}
                  </span>
                )}
              </div>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 md:w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                  <div className="p-3 border-b bg-slate-50 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400">Thông báo mới</span>
                    <X size={14} className="cursor-pointer text-slate-400" onClick={() => setShowNotifications(false)} />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {unreadNotifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 italic text-xs">Không có thông báo mới</div>
                    ) : (
                      unreadNotifications.map((notif) => (
                        <div key={notif.id} className="p-3 border-b last:border-0 hover:bg-slate-50 transition-colors">
                          <p className="text-xs font-bold text-slate-700 leading-tight">{notif.message}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-[8px] text-slate-400 font-bold">
                              {new Date(notif.created_at).toLocaleTimeString('vi-VN')}
                            </span>
                            <button onClick={() => markAsRead(notif.id)} className="text-blue-600 text-[9px] font-black uppercase hover:underline">Đã đọc</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="text-right border-l pl-4 border-slate-200 hidden sm:block">
              <div className="text-[8px] font-bold text-slate-400 uppercase">Server Status</div>
              <div className="text-xs font-black text-emerald-500 flex items-center gap-1.5 justify-end">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> ONLINE
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

// --- DASHBOARD HOME COMPONENT ---
function DashboardHome({ stats, onNavigate }: { stats: any, onNavigate: any }) {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Đơn hàng" value={stats.pendingOrders} subText={`Tổng: ${stats.totalOrders}`} icon={ShoppingCart} color="blue" />
        <StatCard title="Lô sản xuất" value={stats.qcPendingBatches} subText={`Tổng: ${stats.totalBatches}`} icon={PackageCheck} color="orange" />
        <div onClick={() => onNavigate('QC')} className="cursor-pointer transition-transform hover:scale-[1.02]">
          <StatCard title="Cảnh báo QC" value={stats.defectAlerts} subText="Kiểm tra ngay" icon={ShieldAlert} color={stats.defectAlerts > 0 ? "red" : "emerald"} />
        </div>
        <StatCard title="Thiết bị lỗi" value={stats.brokenDevices} subText="Sửa chữa gấp" icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-black text-slate-800 text-[11px] uppercase flex items-center gap-2">
              <Wrench size={16} className="text-blue-500" /> Giám sát máy móc
            </h3>
            <button onClick={() => onNavigate('BẢO TRÌ')} className="text-[10px] font-black text-blue-600 uppercase">Tất cả</button>
          </div>
          <div className="overflow-x-auto">
            <DeviceTable />
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <CalendarCheck className="text-emerald-400 mb-4 w-7 h-7 md:w-8 md:h-8" />
            <h3 className="text-xl font-black italic uppercase leading-tight">Kế hoạch<br />Hôm nay</h3>
            <div className="mt-8 space-y-4 border-t border-white/10 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-white/50 uppercase">Nhiệm vụ</span>
                <span className="text-xl font-black text-emerald-400">{stats.todayTasks}</span>
              </div>
            </div>
            <button onClick={() => onNavigate('KẾ HOẠCH')} className="w-full mt-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase transition-all border border-white/5">
              Xem danh sách việc
            </button>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  );
}