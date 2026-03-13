"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  PlusCircle, 
  AlertCircle, 
  CheckCircle2, 
  PlayCircle, 
  Search, 
  Wrench,
  Filter
} from 'lucide-react';

// Import các component con
import { DeviceCard } from './DeviceCard';
import { HistoryModal } from './HistoryModal';
import { AddDeviceModal } from './AddDeviceModal';
import { RepairModal } from './RepairModal';

export default function EquipmentTab() {
  // --- 1. STATES ---
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDeviceForPart, setSelectedDeviceForPart] = useState<any>(null);
  const [viewHistoryDevice, setViewHistoryDevice] = useState<any>(null);
  
  // States cho Lọc và Tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('ALL');

  // Danh sách khu vực theo yêu cầu chính xác của bạn
  const locations = [
    { id: 'ALL', name: 'Tất cả' },
    { id: 'TẦNG TRỆT PCT', name: 'Trệt PCT' },
    { id: 'TẦNG 2 PCT', name: 'Tầng 2 PCT' },
    { id: 'TẦNG 3 PCT', name: 'Tầng 3 PCT' },
    { id: 'XƯỞNG TRÀ TP', name: 'Xưởng Trà' },
    { id: 'XƯỞNG CAO TP', name: 'Xưởng Cao' },
    { id: 'PHÒNG LAB', name: 'Phòng Lab' },
    { id: 'PHÒNG KỸ THUẬT', name: 'Kỹ Thuật' },
  ];

  // --- 2. LOGICS (FETCH & REALTIME) ---
  const fetchDevices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('equipment_management')
      .select('*')
      .order('device_code', { ascending: true }); // Sắp xếp theo mã máy để dễ quản lý
    
    if (!error && data) setDevices(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDevices();
    
    // Đăng ký kênh realtime để cập nhật dữ liệu ngay lập tức khi có thay đổi trong DB
    const channel = supabase
      .channel('equipment-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'equipment_management' 
      }, () => fetchDevices())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- 3. XỬ LÝ LỌC DỮ LIỆU & CẢNH BÁO ---
  const processedDevices = useMemo(() => {
    const now = new Date();
    
    return devices.map(d => {
      // Kiểm tra xem máy có quá hạn hiệu chuẩn không (Dành cho ISO/QA)
      const calibDate = d.calibration_due_date ? new Date(d.calibration_due_date) : null;
      const isCalibrationOverdue = calibDate && calibDate < now;
      
      return { ...d, isCalibrationOverdue };
    }).filter(d => {
      // Lọc theo từ khóa tìm kiếm (Mã máy hoặc Tên máy)
      const matchSearch = 
        d.device_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.device_code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Lọc theo khu vực
      const matchLocation = filterLocation === 'ALL' || d.location === filterLocation;
      
      return matchSearch && matchLocation;
    });
  }, [devices, searchTerm, filterLocation]);

  // Phân tách máy hỏng/quá hạn và máy hoạt động bình thường
  const urgentDevices = processedDevices.filter(d => d.status !== 'OPERATIONAL' || d.isCalibrationOverdue);
  const operationalDevices = processedDevices.filter(d => d.status === 'OPERATIONAL' && !d.isCalibrationOverdue);

  // --- 4. ACTIONS ---

  // Báo hỏng máy
  const reportIssue = async (id: string) => {
    const { error } = await supabase
      .from('equipment_management')
      .update({ status: 'BROKEN', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) alert("Lỗi: " + error.message);
    else fetchDevices();
  };

  // Thêm máy mới
  const handleAddDevice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = formData.get('code')?.toString().trim();

    const newDevice = {
      device_name: formData.get('name'),
      device_code: code,
      location: formData.get('location'),
      status: 'OPERATIONAL', // Mặc định máy mới nhập là hoạt động tốt
      part_replacement_history: [],
      next_maintenance: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    };

    const { error } = await supabase.from('equipment_management').insert([newDevice]);
    if (error) {
      if (error.code === '23505') alert(`Mã máy ${code} đã tồn tại!`);
      else alert(error.message);
    } else {
      setShowAddModal(false);
      fetchDevices();
    }
  };

  // Hoàn tất sửa chữa & Lưu lịch sử
  const handleReplacePart = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const partName = fd.get('partName');

    const newEntry = {
      id: Date.now(),
      name: partName,
      date: new Date().toLocaleString('vi-VN'),
      technician: "Quản lý sản xuất"
    };

    const updatedHistory = [...(selectedDeviceForPart.part_replacement_history || []), newEntry];

    const { error } = await supabase
      .from('equipment_management')
      .update({ 
        part_replacement_history: updatedHistory,
        status: 'OPERATIONAL', 
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedDeviceForPart.id);

    if (!error) {
      setSelectedDeviceForPart(null);
      fetchDevices();
    }
  };

  // --- 5. RENDER ---
  if (loading) return (
    <div className="p-20 text-center animate-pulse">
      <Wrench className="mx-auto mb-4 text-slate-300" size={48} />
      <div className="text-slate-400 font-black uppercase tracking-widest text-sm italic">
        Đang tải dữ liệu thiết bị...
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 p-4 animate-in fade-in duration-500">
      
      {/* SECTION 1: THANH ĐIỀU KHIỂN (SEARCH, FILTER & NÚT THÊM) */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-sm sticky top-4 z-10">
        {/* Tabs Khu vực */}
        <div className="flex gap-1 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto w-full lg:w-auto no-scrollbar shadow-inner">
          {locations.map(loc => (
            <button
              key={loc.id}
              onClick={() => setFilterLocation(loc.id)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                filterLocation === loc.id 
                ? 'bg-white text-blue-600 shadow-md scale-105' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
              }`}
            >
              {loc.name}
            </button>
          ))}
        </div>

        {/* Tìm kiếm và Thêm mới */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Tìm tên hoặc mã máy..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase hover:bg-blue-600 shadow-xl active:scale-95 transition-all flex-shrink-0"
          >
            <PlusCircle size={18} /> <span>Máy mới</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: CẢNH BÁO QUAN TRỌNG (HỎNG HOẶC QUÁ HẠN HIỆU CHUẨN) */}
      {urgentDevices.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <AlertCircle size={20} className="text-rose-600" />
            <h3 className="font-black text-rose-700 uppercase text-xs">
              Cảnh báo quan trọng ({urgentDevices.length})
            </h3>
            <div className="h-[1px] flex-1 bg-rose-100"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {urgentDevices.map(device => (
              <div key={device.id} className="relative group">
                <DeviceCard 
                  device={device} 
                  isBroken={device.status !== 'OPERATIONAL'} 
                  onRepair={setSelectedDeviceForPart} 
                  onViewHistory={setViewHistoryDevice} 
                  onReport={reportIssue} 
                />
                {device.isCalibrationOverdue && (
                  <div className="absolute -top-2 -right-2 bg-rose-600 text-white text-[8px] font-black px-3 py-1 rounded-full shadow-lg border-2 border-white animate-pulse">
                    QUÁ HẠN HIỆU CHUẨN
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 3: THIẾT BỊ VẬN HÀNH BÌNH THƯỜNG */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
          <PlayCircle size={20} className="text-emerald-500" />
          <h3 className="font-black text-slate-400 uppercase text-[9px] tracking-[0.3em]">
            Hệ thống sẵn sàng ({operationalDevices.length})
          </h3>
          <div className="h-[1px] flex-1 bg-slate-100"></div>
        </div>

        {operationalDevices.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/30">
            <CheckCircle2 size={40} className="mx-auto text-emerald-200 mb-3" />
            <p className="text-slate-400 font-bold uppercase text-[10px]">Khu vực này hiện không có máy hoạt động</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {operationalDevices.map(device => (
              <DeviceCard 
                key={device.id} 
                device={device} 
                isBroken={false} 
                onRepair={setSelectedDeviceForPart} 
                onViewHistory={setViewHistoryDevice} 
                onReport={reportIssue} 
              />
            ))}
          </div>
        )}
      </section>

      {/* --- RENDER MODALS --- */}
      {showAddModal && (
        <AddDeviceModal 
          onClose={() => setShowAddModal(false)} 
          onSubmit={handleAddDevice} 
        />
      )}

      {selectedDeviceForPart && (
        <RepairModal 
          device={selectedDeviceForPart} 
          onClose={() => setSelectedDeviceForPart(null)} 
          onSubmit={handleReplacePart} 
        />
      )}

      {viewHistoryDevice && (
        <HistoryModal 
          device={viewHistoryDevice} 
          onClose={() => setViewHistoryDevice(null)} 
        />
      )}
      
    </div>
  );
}