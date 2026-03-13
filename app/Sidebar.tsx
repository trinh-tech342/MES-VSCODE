"use client";
import React, { useState } from 'react';
import { 
  ClipboardList, Factory, Warehouse, ShieldCheck, 
  ChevronLeft, ChevronRight, LayoutDashboard, Settings, Calendar,
  Wrench // Thêm icon Wrench cho Bảo trì
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, active, collapsed, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`
      relative flex items-center p-3 my-1 cursor-pointer transition-all duration-200 rounded-lg group
      ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'}
    `}
  >
    <Icon size={22} />
    {!collapsed && <span className="ml-3 font-medium transition-opacity duration-300 whitespace-nowrap">{label}</span>}
  </div>
);

export default function Sidebar({ onTabChange, activeTab }: any) {
  const [collapsed, setCollapsed] = useState(false);

  // DANH SÁCH MENU - ĐÃ CẬP NHẬT CẤU HÌNH & BẢO TRÌ
  const menuItems = [
    { label: 'DASHBOARD', icon: LayoutDashboard },
    { label: 'ĐƠN HÀNG', icon: ClipboardList },
    { label: 'SẢN XUẤT', icon: Factory },
    { label: 'KHO VẬN', icon: Warehouse },
    { label: 'QC', icon: ShieldCheck },
    { label: 'BẢO TRÌ', icon: Wrench },      // Mục quản lý thiết bị/hiệu chuẩn
    { label: 'CẤU HÌNH', icon: Settings },   // Mục cài đặt BOM/Quy trình
    { label: 'KẾ HOẠCH', icon: Calendar },
  ];

  return (
    <div className={`h-screen bg-white border-r border-slate-200 transition-all duration-300 relative flex flex-col ${collapsed ? 'w-20' : 'w-64'}`}>
      {/* Nút thu gọn Sidebar */}
      <button 
        onClick={() => setCollapsed(!collapsed)} 
        className="absolute -right-3 top-10 bg-white border border-slate-200 rounded-full p-1 shadow-md z-10 hover:bg-slate-50 transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} /> }
      </button>

      {/* Logo Thương hiệu */}
      <div className="p-6 flex items-center mb-4">
        <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold shadow-inner">M</div>
        {!collapsed && <span className="ml-3 text-xl font-bold text-slate-800 tracking-tight uppercase">MES PRO</span>}
      </div>

      {/* Danh sách Menu điều hướng */}
      <nav className="flex-1 px-4 overflow-y-auto">
        {menuItems.map((item) => (
          <SidebarItem 
            key={item.label}
            icon={item.icon} 
            label={item.label} 
            active={activeTab === item.label} 
            collapsed={collapsed}
            onClick={() => onTabChange(item.label)} 
          />
        ))}
      </nav>

      {/* Thông tin User */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'p-2'}`}>
          <img 
            src={`https://ui-avatars.com/api/?name=Admin&background=1d4ed8&color=fff`} 
            alt="Avatar" 
            className="w-9 h-9 rounded-full border border-white shadow-sm" 
          />
          {!collapsed && (
            <div className="ml-3 overflow-hidden text-[13px]">
              <p className="font-bold text-slate-800 truncate leading-none mb-1">Quản lý SX</p>
              <p className="text-slate-500 truncate italic text-[11px]">Hệ thống trực tuyến</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}