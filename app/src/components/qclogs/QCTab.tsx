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
   * 1. HÀM LẤY DỮ LIỆU TỔNG HỢP
   * Đã sửa lỗi: Cột 'name' thay cho 'material_name' theo đúng schema material_catalog
   */
  const fetchQCData = useCallback(async () => {
    setLoading(true);
    try {
      let rawData: any[] = [];
      let error: any = null;

      if (activeSubTab === 'IQC') {
        // IQC: Lấy từ lô nguyên liệu nhập kho
        const { data, error: iqcError } = await supabase
          .from('material_lots')
          .select('*') // Đơn giản là lấy tất cả các cột
          .order('import_date', { ascending: false })
          .limit(100);
        
        rawData = data || [];
        error = iqcError;
      } 
      else if (activeSubTab === 'OQC') {
        // OQC: Lấy từ lệnh sản xuất, join với catalog để lấy tên sản phẩm
        const { data, error: oqcError } = await supabase
          .from('batch_records')
          .select(`
            *,
            material_catalog!fk_batch_sku_catalog (
              name,
              sku
            )
          `)
          .order('created_at', { ascending: false });
        
        rawData = data || [];
        error = oqcError;
      }

      if (error) {
        // Log chi tiết để tránh lỗi hiển thị "{}"
        console.error("Supabase Error Details:", {
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      // 2. MAPPING DỮ LIỆU ĐỂ ĐỒNG BỘ GIAO DIỆN
      const formatted = rawData.map(item => {
        if (activeSubTab === 'OQC') {
          return {
            id: item.id,
            lot_id: item.batch_number || 'N/A',
            sku: item.sku || 'N/A',
            // Sử dụng item.material_catalog.name theo đúng schema SQL
            product_name: item.material_catalog?.name || 'Thành phẩm chưa rõ tên',
            output_qty: Number(item.output_qty || 0),
            unit: item.unit || 'Sp',
            status: item.qc_status, 
            date: item.created_at,
            notes: item.notes || "",
            raw: item 
          };
        } else {
          // Mapping cho IQC
          return {
            id: item.id,
            lot_id: item.lot_number || 'N/A',
            sku: item.material_sku || 'N/A',
            product_name: item.material_name || 'Nguyên liệu mới',
            supplier_name: item.supplier_name || 'Không có NCC',
            output_qty: Number(item.remaining_quantity || 0),
            unit: item.unit || 'Kg',
            status: item.status, 
            date: item.import_date,
            notes: item.notes || "",
            raw: item
          };
        }
      });
      
      setQcLots(formatted);
    } catch (err: any) {
      console.error("Lỗi hệ thống QC:", err.message || err);
    } finally { 
      setLoading(false); 
    }
  }, [activeSubTab]);

  useEffect(() => { 
    setSearchTerm("");
    fetchQCData(); 
  }, [fetchQCData]);

  /**
   * 3. XỬ LÝ CẬP NHẬT TRẠNG THÁI (PASSED/FAILED)
   */
  const handleUpdateStatus = async (newStatus: boolean) => {
    if (!viewingLot) return;
    setIsUpdating(true);
    try {
      const isIQC = activeSubTab === 'IQC';
      const tableName = isIQC ? 'material_lots' : 'batch_records';
      const statusValue = newStatus ? 'Passed' : 'Failed';
      
      const updateData = isIQC 
        ? { status: statusValue }
        : { qc_status: statusValue };

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', viewingLot.id);

      if (error) throw error;
      
      await fetchQCData(); 
      setIsSidePanelOpen(false);
      setViewingLot(null);
    } catch (e: any) {
      alert("Lỗi cập nhật QC: " + (e.message || "Lỗi không xác định"));
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
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Hệ thống Kiểm soát Chất lượng</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Real-time Quality Management System</p>
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
                viewingLotId={viewingLot?.id}
                isSidePanelOpen={isSidePanelOpen}
              />
            )}
            
            {activeSubTab === 'OQC' && (
              <OQCManager 
                lots={qcLots} 
                loading={loading} 
                searchTerm={searchTerm} 
                setSearchTerm={setSearchTerm}
                onOpenDetail={(lot: any) => { setViewingLot(lot); setIsSidePanelOpen(true); }}
                onRefresh={fetchQCData}
              />
            )}

            {activeSubTab === 'PQC' && <PQCManager />}
          </main>
        </div>
      </div>
      
      {/* SIDE PANEL CHI TIẾT QC */}
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

      {/* OVERLAY LOADING TOÀN TRANG */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
           <Loader2 className="animate-spin text-indigo-600" size={40} />
        </div>
      )}
    </div>
  );
}