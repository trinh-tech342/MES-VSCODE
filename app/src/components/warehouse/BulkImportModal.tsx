"use client";
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { X, FileUp, FileSpreadsheet, Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Select from 'react-select'; // Import react-select

interface BulkImportModalProps {
    show: boolean;
    onClose: () => void;
    bomList: any[];
    onSuccess: () => void;
}

export const BulkImportModal = ({ show, onClose, bomList, onSuccess }: BulkImportModalProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Chuyển đổi bomList thành định dạng Options cho react-select
    const materialOptions = bomList.map(b => ({
        value: b.sku,
        label: `${b.sku} - ${b.name}`,
        name: b.name,
        unit: b.unit
    }));

    const initialRow = () => ({
        id: Date.now() + Math.random(),
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

    // Style tùy chỉnh cho react-select bên trong bảng
    const customStyles = {
        control: (base: any) => ({
            ...base,
            backgroundColor: '#f8fafc', // slate-50
            borderRadius: '0.75rem',
            border: '1px solid transparent',
            fontSize: '0.75rem', // text-xs
            fontWeight: '700',
            minHeight: '45px',
            boxShadow: 'none',
            '&:hover': { borderColor: '#60a5fa' }
        }),
        menuPortal: (base: any) => ({ ...base, zIndex: 9999 }), // Tránh bị che bởi modal/table
        option: (base: any, state: any) => ({
            ...base,
            fontSize: '0.75rem',
            fontWeight: '700',
            backgroundColor: state.isFocused ? '#eff6ff' : 'white',
            color: state.isFocused ? '#2563eb' : '#475569',
        })
    };

    if (!show) return null;

    const addRow = () => setRows([...rows, initialRow()]);
    
    const removeRow = (id: number) => {
        if (rows.length > 1) setRows(rows.filter(r => r.id !== id));
    };

    const updateRow = (id: number, field: string, value: any) => {
        setRows(rows.map(r => {
            if (r.id === id) {
                if (field === 'material_sku') {
                    // value lúc này là object từ react-select
                    return { 
                        ...r, 
                        material_sku: value?.value || '',
                        material_name: value?.name || '',
                        unit: value?.unit || ''
                    };
                }
                return { ...r, [field]: value };
            }
            return r;
        }));
    };

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
                    id: Date.now() + idx + Math.random(),
                    material_sku: sku,
                    material_name: match?.name || item['Tên vật tư'] || '',
                    lot_number: item['Số Lô'] || item['lot'] || '',
                    supplier_name: item['Nhà cung cấp'] || '',
                    import_date: new Date().toISOString().split('T')[0],
                    mfg_date: item['Ngày SX'] || '',
                    exp_date: item['Hạn dùng'] || '',
                    import_quantity: parseFloat(item['Số lượng']) || 0,
                    unit: match?.unit || item['Đơn vị'] || '',
                    status: 'Pending'
                };
            });
            setRows(importedRows);
        };
        reader.readAsBinaryString(file);
    };

    const handleBulkSubmit = async () => {
        const finalData = rows
            .filter(r => r.material_sku && r.lot_number)
            .map(({ id, ...rest }) => ({
                ...rest,
                material_name: rest.material_name || "N/A",
                supplier_name: rest.supplier_name || 'N/A',
                mfg_date: rest.mfg_date || null,
                exp_date: rest.exp_date || null,
                import_quantity: Number(rest.import_quantity) || 0,
                remaining_quantity: Number(rest.import_quantity) || 0,
                status: 'Pending'
            }));

        if (finalData.length === 0) return alert("Vui lòng điền ít nhất 1 lô!");

        const { error } = await supabase.from('material_lots').insert(finalData);

        if (!error) {
            alert("Đã gửi yêu cầu nhập kho! Vui lòng chờ QC phê duyệt.");
            setRows([initialRow()]);
            onSuccess();
            onClose();
        } else {
            alert(`Lỗi hệ thống: ${error.message}`);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative bg-white w-[95vw] max-w-7xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                            <FileUp className="text-blue-400" /> Nhập Kho Nguyên Liệu
                        </h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Trạng thái: QC Pending</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={28} /></button>
                </div>

                <div className="p-8 overflow-y-auto grow">
                    <div onClick={() => fileInputRef.current?.click()} className="group border-2 border-dashed border-slate-200 rounded-[2rem] p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all mb-6 text-center">
                        <input type="file" hidden ref={fileInputRef} accept=".xlsx, .xls" onChange={handleFileUpload} />
                        <FileSpreadsheet className="text-emerald-500 mb-2" size={32} />
                        <p className="text-sm font-black text-slate-700 uppercase">Tải file Excel để nhập hàng loạt</p>
                    </div>

                    <table className="w-full text-left border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase">
                                <th className="px-4 py-2 w-1/4">SKU / Vật tư</th>
                                <th className="px-4 py-2">Số Lô</th>
                                <th className="px-4 py-2">Nhà Cung Cấp</th>
                                <th className="px-4 py-2 w-32">Ngày Nhập</th>
                                <th className="px-4 py-2 w-32">Hạn dùng</th>
                                <th className="px-4 py-2 w-32">Số lượng</th>
                                <th className="px-4 py-2 text-center w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id} className="group transition-all">
                                    <td className="px-2">
                                        <Select
                                            options={materialOptions}
                                            styles={customStyles}
                                            placeholder="Chọn mã..."
                                            value={materialOptions.find(opt => opt.value === row.material_sku) || null}
                                            onChange={(val) => updateRow(row.id, 'material_sku', val)}
                                            menuPortalTarget={typeof window !== "undefined" ? document.body : null}
                                            isSearchable
                                        />
                                        {row.material_name && (
                                            <span className="text-[9px] font-bold text-blue-500 mt-1 block px-2 italic line-clamp-1">
                                                {row.material_name}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-2">
                                        <input type="text" placeholder="Số lô..." className="w-full bg-slate-50 rounded-xl py-3 px-3 text-xs font-bold outline-none border border-transparent focus:border-blue-400 h-[45px]" value={row.lot_number} onChange={e => updateRow(row.id, 'lot_number', e.target.value)} />
                                    </td>
                                    <td className="px-2">
                                        <input type="text" placeholder="NCC..." className="w-full bg-slate-50 rounded-xl py-3 px-3 text-xs font-bold outline-none border border-transparent focus:border-blue-400 h-[45px]" value={row.supplier_name} onChange={e => updateRow(row.id, 'supplier_name', e.target.value)} />
                                    </td>
                                    <td className="px-2">
                                        <input type="date" className="w-full bg-slate-50 rounded-xl py-3 px-3 text-[10px] font-bold outline-none border border-transparent focus:border-blue-400 h-[45px]" value={row.import_date} onChange={e => updateRow(row.id, 'import_date', e.target.value)} />
                                    </td>
                                    <td className="px-2">
                                        <input type="date" className="w-full bg-slate-50 rounded-xl py-3 px-3 text-[10px] font-bold outline-none border border-transparent focus:border-blue-400 h-[45px]" value={row.exp_date} onChange={e => updateRow(row.id, 'exp_date', e.target.value)} />
                                    </td>
                                    <td className="px-2">
                                        <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 border border-transparent focus-within:border-blue-400 h-[45px]">
                                            <input type="number" className="w-full bg-transparent py-3 text-xs font-black text-blue-600 outline-none" value={row.import_quantity} onChange={e => updateRow(row.id, 'import_quantity', e.target.value)} />
                                            <span className="text-[9px] font-black text-slate-400 uppercase">{row.unit || '...'}</span>
                                        </div>
                                    </td>
                                    <td className="px-2 text-center">
                                        <button onClick={() => removeRow(row.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={addRow} className="mt-4 flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"><Plus size={14} /> Thêm dòng mới</button>
                </div>

                <div className="p-8 bg-slate-50 border-t flex justify-between items-center shrink-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Tổng cộng: {rows.filter(r => r.material_sku).length} lô nguyên liệu
                    </p>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-8 py-3 rounded-2xl font-black text-xs uppercase text-slate-500 hover:bg-slate-100 transition-all">Hủy bỏ</button>
                        <button onClick={handleBulkSubmit} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase hover:bg-blue-600 transition-all shadow-xl flex items-center gap-2">
                            <Save size={18} /> Xác nhận nhập kho
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};