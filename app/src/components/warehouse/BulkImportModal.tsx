"use client";
import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { X, FileUp, FileSpreadsheet, Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Select from 'react-select';

// 1. Danh sách đơn vị cố định
const UNIT_OPTIONS = [
    { value: 'Kg', label: 'Kg' },
    { value: 'Gói', label: 'Gói' },
    { value: 'Hũ', label: 'Hũ' },
    { value: 'Bao', label: 'Bao' },
    { value: 'Hộp', label: 'Hộp' },
    { value: 'Vỉ', label: 'Vỉ' },
];

interface BulkImportModalProps {
    show: boolean;
    onClose: () => void;
    bomList: any[];
    onSuccess: () => void;
    initialData?: any;
}

export const BulkImportModal = ({ show, onClose, bomList, onSuccess, initialData }: BulkImportModalProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Tạo dòng trống mặc định với ID duy nhất
    const initialRow = () => ({
        id: Math.random() + Date.now(),
        material_sku: '',
        material_name: '',
        lot_number: '',
        supplier_name: '',
        import_date: new Date().toISOString().split('T')[0],
        mfg_date: '',
        exp_date: '',
        import_quantity: 0,
        unit: '', 
        status: 'Pending'
    });

    const [rows, setRows] = useState<any[]>([initialRow()]);

    // --- LOGIC QUẢN LÝ DÒNG (THÊM/XÓA/SỬA) ---
    const addRow = () => setRows(prev => [...prev, initialRow()]);

    const removeRow = (id: number) => {
        setRows(prev => {
            if (prev.length > 1) return prev.filter(r => r.id !== id);
            return [initialRow()]; // Nếu là dòng cuối cùng thì reset chứ không xóa
        });
    };

    const updateRow = (id: number, field: string, value: any) => {
        setRows(prev => prev.map(r => {
            if (r.id === id) {
                if (field === 'material_sku') {
                    return {
                        ...r,
                        material_sku: value?.value || '',
                        material_name: value?.name || '',
                        unit: value?.unit || r.unit 
                    };
                }
                return { ...r, [field]: value };
            }
            return r;
        }));
    };

    // --- XỬ LÝ DỮ LIỆU TỪ LỆNH THU MUA ---
    useEffect(() => {
        if (show && initialData) {
            const purchaseRow = {
                ...initialRow(),
                material_sku: initialData.sku,
                material_name: initialData.name,
                lot_number: `PO-${new Date().getTime().toString().slice(-4)}`,
                import_quantity: initialData.quantity,
                unit: initialData.unit || 'Kg',
            };

            setRows(prev => {
                const isFirstRowEmpty = prev.length === 1 && !prev[0].material_sku;
                return isFirstRowEmpty ? [purchaseRow] : [purchaseRow, ...prev];
            });
        }
    }, [show, initialData]);

    // --- XỬ LÝ FILE EXCEL ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data: any[] = XLSX.utils.sheet_to_json(ws);
            
            const importedRows = data.map((item, idx) => {
                const sku = item['Mã SKU'] || item['sku'] || '';
                const match = bomList.find(b => b.sku === sku);
                return {
                    ...initialRow(),
                    id: Date.now() + idx + Math.random(),
                    material_sku: sku,
                    material_name: match?.name || item['Tên vật tư'] || '',
                    lot_number: String(item['Số Lô'] || item['lot'] || ''),
                    supplier_name: item['Nhà cung cấp'] || '',
                    import_quantity: parseFloat(item['Số lượng']) || 0,
                    unit: match?.unit || item['Đơn vị'] || 'Kg',
                };
            });
            setRows(importedRows.length > 0 ? importedRows : [initialRow()]);
        };
        reader.readAsBinaryString(file);
    };

    const materialOptions = bomList.map(b => ({
        value: b.sku,
        label: `${b.sku} - ${b.name}`,
        name: b.name,
        unit: b.unit
    }));

// --- SUBMIT LÊN SUPABASE ---
const handleBulkSubmit = async () => {
    const finalData = rows
        .filter(r => r.material_sku && r.lot_number) // Chỉ lấy dòng có SKU và Số Lô
        .map(({ id, ...rest }) => ({
            ...rest,
            material_name: rest.material_name || "N/A",
            supplier_name: rest.supplier_name || 'N/A',
            import_quantity: Number(rest.import_quantity) || 0,
            remaining_quantity: Number(rest.import_quantity) || 0,
            unit: rest.unit || 'Kg',
            // SỬA LỖI TẠI ĐÂY: Nếu rỗng thì gán NULL thay vì ""
            import_date: rest.import_date || new Date().toISOString().split('T')[0],
            mfg_date: rest.mfg_date || null, 
            exp_date: rest.exp_date || null,
            status: rest.status || 'Pending'
        }));

    if (finalData.length === 0) return alert("Vui lòng chọn vật tư và điền số lô!");

    const { error } = await supabase.from('material_lots').insert(finalData);

    if (!error) {
        alert("🚀 Thành công: Dữ liệu đã được lưu!");
        setRows([initialRow()]);
        onSuccess();
        onClose();
    } else {
        console.error("Chi tiết lỗi:", error);
        alert(`❌ Lỗi hệ thống: ${error.message}`);
    }
};

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative bg-white w-[98vw] max-w-7xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-200">
                
                {/* HEADER */}
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                            <FileUp className="text-blue-400" /> Nhập Kho Hệ Thống
                        </h3>
                        {initialData && <p className="text-[10px] text-emerald-400 font-bold mt-1 uppercase italic">• Đang nạp từ lệnh mua hàng</p>}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                </div>

                {/* TABLE CONTENT */}
                <div className="p-6 overflow-y-auto grow">
                    {/* Nút Import nhanh */}
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="mb-4 border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all group"
                    >
                        <input type="file" hidden ref={fileInputRef} accept=".xlsx, .xls" onChange={handleFileUpload} />
                        <FileSpreadsheet className="text-emerald-500 group-hover:scale-110 transition-transform" size={24} />
                        <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">Tải file Excel để nhập nhanh</span>
                    </div>

                    <table className="w-full text-left border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                                <th className="px-4 py-2 w-1/4">SKU / Vật tư</th>
                                <th className="px-4 py-2">Số Lô</th>
                                <th className="px-4 py-2">Nhà Cung Cấp</th>
                                <th className="px-4 py-2 w-32">Ngày Nhập</th>
                                <th className="px-4 py-2 w-32">Hạn dùng</th>
                                <th className="px-4 py-2 w-48">Số lượng & Đơn vị</th>
                                <th className="px-4 py-2 text-center w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id} className="group transition-all">
                                    <td className="px-1">
                                        <Select
                                            options={materialOptions}
                                            placeholder="Chọn mã..."
                                            value={materialOptions.find(opt => opt.value === row.material_sku) || null}
                                            onChange={(val) => updateRow(row.id, 'material_sku', val)}
                                            menuPortalTarget={typeof window !== "undefined" ? document.body : null}
                                            styles={{
                                                control: (base) => ({ ...base, borderRadius: '0.75rem', fontSize: '12px', minHeight: '45px', border: '1px solid #f1f5f9' }),
                                                menuPortal: (base) => ({ ...base, zIndex: 9999 })
                                            }}
                                        />
                                    </td>
                                    <td className="px-1">
                                        <input type="text" placeholder="Số lô..." className="w-full bg-slate-50 rounded-xl py-3 px-3 text-xs font-bold border border-transparent focus:border-blue-400 h-[45px] outline-none" value={row.lot_number} onChange={e => updateRow(row.id, 'lot_number', e.target.value)} />
                                    </td>
                                    <td className="px-1">
                                        <input type="text" placeholder="NCC..." className="w-full bg-slate-50 rounded-xl py-3 px-3 text-xs font-bold border border-transparent focus:border-blue-400 h-[45px] outline-none" value={row.supplier_name} onChange={e => updateRow(row.id, 'supplier_name', e.target.value)} />
                                    </td>
                                    <td className="px-1">
                                        <input type="date" className="w-full bg-slate-50 rounded-xl py-3 px-3 text-[10px] font-bold h-[45px] outline-none" value={row.import_date} onChange={e => updateRow(row.id, 'import_date', e.target.value)} />
                                    </td>
                                    <td className="px-1">
                                        <input type="date" className="w-full bg-slate-50 rounded-xl py-3 px-3 text-[10px] font-bold h-[45px] outline-none" value={row.exp_date} onChange={e => updateRow(row.id, 'exp_date', e.target.value)} />
                                    </td>
                                    
                                    <td className="px-1">
                                        <div className="flex items-center gap-1 bg-slate-50 rounded-xl px-2 border border-transparent focus-within:border-blue-400 h-[45px]">
                                            <input 
                                                type="number" 
                                                className="w-1/2 bg-transparent py-3 text-xs font-black text-blue-600 outline-none" 
                                                value={row.import_quantity} 
                                                onChange={e => updateRow(row.id, 'import_quantity', e.target.value)} 
                                            />
                                            <select 
                                                className="w-1/2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase px-1 py-1 text-slate-600 outline-none focus:border-blue-500 cursor-pointer"
                                                value={row.unit}
                                                onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                                            >
                                                <option value="">UNIT</option>
                                                {UNIT_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </td>

                                    <td className="px-1 text-center">
                                        <button 
                                            onClick={() => removeRow(row.id)} 
                                            className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                                            title="Xóa dòng"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={addRow} className="mt-4 flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase hover:bg-blue-50 px-4 py-2 rounded-xl transition-all">
                        <Plus size={14} /> Thêm dòng mới
                    </button>
                </div>

                {/* FOOTER */}
                <div className="p-6 bg-slate-50 border-t flex justify-between items-center shrink-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Tổng cộng: {rows.filter(r => r.material_sku).length} mặt hàng
                    </span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-3 rounded-xl font-black text-xs uppercase text-slate-500 hover:bg-slate-100">Hủy</button>
                        <button onClick={handleBulkSubmit} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-xs uppercase hover:bg-blue-600 transition-all shadow-lg flex items-center gap-2">
                            <Save size={16} /> Lưu nhập kho
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};