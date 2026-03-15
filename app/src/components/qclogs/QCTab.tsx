"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Loader2 } from 'lucide-react';

import IQCManager from './IQCManager';
import PQCManager from './PQCManager';
import OQCManager from './OQCManager';
import QCDetailPanel from './QCDetailPanel'; 

export default function QCTab() {
  const [activeSubTab, setActiveSubTab] = useState<'IQC' | 'PQC' | 'OQC'>('IQC');
  const [qcLots, setQcLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingLot, setViewingLot] = useState<any>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  /**
   * 1. HÀM LẤY DỮ LIỆU TỔNG HỢP (onRefresh)
   * Sử dụng useCallback để hàm không bị định nghĩa lại mỗi lần render
   */
  const fetchQCData = useCallback(async () => {
    setLoading(true);
    try {
      let rawData: any[] = [];
      let error: any = null;

      if (activeSubTab === 'IQC') {
        const { data, error: iqcError } = await supabase
          .from('material_lots')
          .select('*') 
          .order('import_date', { ascending: false })
          .limit(100);
        
        rawData = data || [];
        error = iqcError;
      } 
      else if (activeSubTab === 'OQC') {
        const { data, error: oqcError } = await supabase
          .from('batch_records')
          .select(`
            *,
            material_catalog!fk_batch_sku_catalog (name, sku)
          `)
          .order('created_at', { ascending: false });
        
        rawData = data || [];
        error = oqcError;
      }

      if (error) throw error;

      const formatted = rawData.map(item => {
        if (activeSubTab === 'OQC') {
          return {
            id: item.id,
            lot_id: item.batch_number || 'N/A',
            sku: item.sku || 'N/A',
            product_name: item.material_catalog?.name || 'Thành phẩm chưa rõ tên',
            output_qty: Number(item.output_qty || 0),
            unit: item.unit || 'Sp',
            status: item.qc_status === 'Passed' ? true : (item.qc_status === 'Failed' ? false : null), 
            date: item.created_at,
            evidence_url: item.evidence_url,
            notes: item.notes || "",
            raw: item 
          };
        } else {
          return {
            id: item.id,
            lot_id: item.lot_number || 'N/A',
            sku: item.material_sku || 'N/A',
            product_name: item.material_name || 'Nguyên liệu mới',
            supplier_name: item.supplier_name || 'Không có NCC',
            output_qty: Number(item.remaining_quantity || 0),
            unit: item.unit || 'Kg',
            status: item.status === 'Passed' ? true : (item.status === 'Pending' ? null : false),
            date: item.import_date,
            evidence_url: item.evidence_url,
            notes: item.notes || "",
            raw: item
          };
        }
      });
      
      setQcLots(formatted);
      
      // Cập nhật viewingLot nếu đang mở
      if (viewingLot) {
        const updatedViewing = formatted.find(f => f.id === viewingLot.id);
        if (updatedViewing) setViewingLot(updatedViewing);
      }
    } catch (err: any) {
      console.error("Lỗi hệ thống QC:", err.message);
    } finally { 
      setLoading(false); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab, viewingLot?.id]); 

  /**
   * 2. EFFECT: FETCH DỮ LIỆU KHI TAB THAY ĐỔI
   * Mảng dependency [activeSubTab, fetchQCData] luôn có 2 phần tử
   */
  useEffect(() => { 
    setSearchTerm("");
    fetchQCData(); 
  }, [activeSubTab, fetchQCData]);

  /**
   * 3. XỬ LÝ CẬP NHẬT TRẠNG THÁI
   */
 const handleUpdateStatus = async (newStatus: boolean | null, updatedUrl?: string) => {
  if (!viewingLot) return;
  setIsUpdating(true);

  try {
    const isIQC = activeSubTab === 'IQC';
    const tableName = isIQC ? 'material_lots' : 'batch_records';
    
    // 1. Chuẩn bị giá trị trạng thái cho bảng nghiệp vụ (String: Passed/Failed)
    let statusText = viewingLot.raw.status || viewingLot.raw.qc_status;
    if (newStatus === true) statusText = 'Passed';
    if (newStatus === false) statusText = 'Failed';

    const updateBusinessData: any = isIQC 
      ? { status: statusText }
      : { qc_status: statusText };

    // 2. CẬP NHẬT BẢNG NGHIỆP VỤ (Bảng chính để chạy kho/sản xuất)
    const { error: bizError } = await supabase
      .from(tableName)
      .update(updateBusinessData)
      .eq('id', viewingLot.id);

    if (bizError) throw bizError;

    // 3. CẬP NHẬT BẢNG QC_LOGS (Bảng nhật ký kiểm định)
    // Lưu ý: viewingLot.qc_log_id phải là ID của dòng tương ứng trong bảng qc_logs
    if (viewingLot.qc_log_id) {
      const qcLogUpdate: any = {
        updated_at: new Date().toISOString(),
      };
      
      // Chỉ cập nhật status nếu người dùng nhấn nút Duyệt/Từ chối (newStatus !== null)
      if (newStatus !== null) {
        qcLogUpdate.status = newStatus; 
      }
      
      // Cập nhật ảnh nếu có
      if (updatedUrl) {
        qcLogUpdate.evidence_url = updatedUrl;
      }

      const { error: logError } = await supabase
        .from('qc_logs')
        .update(qcLogUpdate)
        .eq('id', viewingLot.qc_log_id);

      if (logError) console.error("Lưu log thất bại nhưng nghiệp vụ đã xong:", logError);
    }

    // 4. LÀM MỚI UI VÀ ĐÓNG PANEL
    await fetchQCData(); 

    if (newStatus !== null) {
      alert(newStatus ? "✅ Phê duyệt thành công!" : "❌ Đã từ chối lô hàng!");
      setIsSidePanelOpen(false);
      setViewingLot(null);
    } else if (updatedUrl) {
      alert("📸 Đã cập nhật hình ảnh minh chứng!");
    }

  } catch (e: any) {
    alert("Lỗi hệ thống QC: " + (e.message || "Lỗi không xác định"));
  } finally {
    setIsUpdating(false);
  }
};

  return (
    <div className="relative min-h-screen bg-slate-50/50 -m-6 p-6 overflow-hidden">
      <div className={`transition-all duration-500 ease-in-out ${isSidePanelOpen ? 'pr-[450px]' : ''}`}>
        <div className="max-w-[1400px] mx-auto space-y-6">
          
          {/* HEADER NAV */}
          <header className="bg-white p-4 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3 ml-2">
              <div className="p-2 bg-indigo-600 rounded-2xl text-white shadow-lg">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Quản lý Chất lượng</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hệ thống giám sát IQC/PQC/OQC</p>
              </div>
            </div>
            
            <div className="flex p-1.5 bg-slate-100 rounded-2xl">
              {['IQC', 'PQC', 'OQC'].map((id) => (
                <button 
                  key={id} 
                  onClick={() => { 
                    setActiveSubTab(id as any); 
                    setIsSidePanelOpen(false);
                    setViewingLot(null); 
                  }} 
                  className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                    activeSubTab === id ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </header>

          {/* MAIN CONTENT AREA */}
          <main className="min-h-[600px]">
            {activeSubTab === 'IQC' && (
              <IQCManager 
                lots={qcLots} 
                loading={loading} 
                searchTerm={searchTerm} 
                setSearchTerm={setSearchTerm} 
                onOpenDetail={(lot: any) => { setViewingLot(lot); setIsSidePanelOpen(true); }}
                onRefresh={fetchQCData}
              />
            )}
            
            {activeSubTab === 'OQC' && (
              <OQCManager 
                lots={qcLots} 
                loading={loading} 
                searchTerm={searchTerm} 
                setSearchTerm={setSearchTerm}
                onRefresh={fetchQCData} 
                onOpenDetail={(lot: any) => { setViewingLot(lot); setIsSidePanelOpen(true); }}
              />
            )}

            {activeSubTab === 'PQC' && <PQCManager />}
          </main>
        </div>
      </div>
      
      {/* SIDE PANEL */}
      {(activeSubTab === 'IQC' || activeSubTab === 'OQC') && (
        <QCDetailPanel 
          isOpen={isSidePanelOpen}
          onClose={() => {
            setIsSidePanelOpen(false);
            setViewingLot(null);
          }}
          lot={viewingLot}
          activeSubTab={activeSubTab}
          isUpdating={isUpdating}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* OVERLAY LOADING */}
      {loading && !qcLots.length && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-[100] flex items-center justify-center">
           <Loader2 className="animate-spin text-indigo-600" size={40} />
        </div>
      )}
    </div>
  );
}