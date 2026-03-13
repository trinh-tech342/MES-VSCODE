"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Beaker, Box, Plus, Trash2, X, Loader2, Search, GripVertical, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// DnD Kit Imports
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 1. INTERFACES
interface BomItem {
  id: string;
  material_sku: string;
  material_name: string;
  type: string;
  unit: string;
  quantity: number;
}

interface BomManagerProps {
  parentSku: string;
  bomData: BomItem[];
  setBomData: React.Dispatch<React.SetStateAction<BomItem[]>>;
  isLoading?: boolean;
}

// 2. SORTABLE ROW COMPONENT (Dòng đã lưu)
function SortableRow({ item, onDelete, onUpdate }: { 
  item: BomItem, 
  onDelete: (id: string) => void, 
  onUpdate: (id: string, qty: number) => void 
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    position: 'relative' as any, 
  };

  return (
    <tr ref={setNodeRef} style={style} className={`hover:bg-slate-50/50 transition-colors group ${isDragging ? 'bg-white shadow-2xl opacity-50' : ''}`}>
      <td className="p-6 w-12 text-center">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
          <GripVertical size={18} />
        </button>
      </td>
      <td className="p-6 w-20 text-center">
        {item.type === 'Packaging' ? <Box size={18} className="text-orange-400 mx-auto" /> : <Beaker size={18} className="text-blue-400 mx-auto" />}
      </td>
      <td className="p-6">
        <p className="font-black text-slate-700 text-sm">{item.material_name}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase">{item.material_sku}</p>
      </td>
      <td className="p-6 text-center">
        <span className="text-[10px] font-black px-3 py-1.5 bg-slate-100 rounded-lg text-slate-500 uppercase">{item.unit}</span>
      </td>
      <td className="p-6 text-right font-black text-blue-600 text-sm">
         <input 
          type="number"
          step="0.00001"
          defaultValue={item.quantity}
          onBlur={(e) => onUpdate(item.id, parseFloat(e.target.value))}
          className="w-32 p-2 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-500 focus:bg-white text-right outline-none transition-all"
        />
      </td>
      <td className="p-6 text-center w-20">
        <button onClick={() => onDelete(item.id)} className="text-slate-200 hover:text-rose-500 transition-colors">
          <Trash2 size={16}/>
        </button>
      </td>
    </tr>
  );
}

// 3. MAIN COMPONENT
export default function BomManager({ parentSku, bomData, setBomData, isLoading }: BomManagerProps) {
  const [showAddBom, setShowAddBom] = useState(false);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  
  const [newItems, setNewItems] = useState([
    { id: 'initial-1', tempSearch: '', material_sku: '', material_name: '', type: 'Chemical', unit: 'kg', quantity: 0 }
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (showAddBom && catalog.length === 0) {
      const fetchCatalog = async () => {
        const { data } = await supabase.from('material_catalog').select('*');
        setCatalog(data || []);
      };
      fetchCatalog();
    }
  }, [showAddBom, catalog.length]);

  const handlePasteQuantity = useCallback((e: React.ClipboardEvent, startIndex: number) => {
    const pasteData = e.clipboardData.getData('text');
    const rows = pasteData.split(/\r?\n/).map(r => r.trim()).filter(r => r !== "");
    
    if (rows.length > 1) {
      e.preventDefault();
      setNewItems(prev => {
        const updated = [...prev];
        rows.forEach((value, i) => {
          const targetIndex = startIndex + i;
          if (updated[targetIndex]) {
            updated[targetIndex].quantity = parseFloat(value.replace(',', '.')) || 0;
          }
        });
        return updated;
      });
    }
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = bomData.findIndex((i) => i.id === active.id);
      const newIndex = bomData.findIndex((i) => i.id === over.id);
      setBomData(arrayMove(bomData, oldIndex, newIndex));
    }
  };

  const updateQuantity = async (id: string, qty: number) => {
    const { error } = await supabase.from('product_bom').update({ quantity: qty }).eq('id', id);
    if (!error) setBomData(prev => prev.map(item => item.id === id ? { ...item, quantity: qty } : item));
  };

  const handleDeleteBom = async (id: string) => {
    if (!confirm("Xóa định mức này?")) return;
    const { error } = await supabase.from('product_bom').delete().eq('id', id);
    if (!error) setBomData(prev => prev.filter(item => item.id !== id));
  };

  const handleBatchAddBom = async () => {
    const validItems = newItems.filter(item => item.material_sku !== '');
    if (validItems.length === 0) return alert("Vui lòng chọn vật tư");

    setIsSubmitting(true);
    const itemsToInsert = validItems.map(item => ({ 
      parent_sku: parentSku,
      material_sku: item.material_sku,
      material_name: item.material_name,
      type: item.type,
      unit: item.unit,
      quantity: item.quantity
    }));

    const { data, error } = await supabase.from('product_bom').insert(itemsToInsert).select();
    if (!error && data) {
      setBomData(prev => [...prev, ...data]);
      setShowAddBom(false);
      setNewItems([{ id: Date.now().toString(), tempSearch: '', material_sku: '', material_name: '', type: 'Chemical', unit: 'kg', quantity: 0 }]);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
        <h4 className="font-black text-slate-800 text-sm flex items-center gap-2 uppercase tracking-widest">
          <Beaker size={20} className="text-emerald-500"/> Định mức vật tư
        </h4>
        <button onClick={() => setShowAddBom(true)} className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-600 shadow-lg active:scale-95 transition-all">
          + Nhập nhanh / Bao bì
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-50">
                <th className="p-6 w-12"></th>
                <th className="p-6 w-20 text-center">Loại</th>
                <th className="p-6">Vật tư</th>
                <th className="p-6 text-center">ĐVT</th>
                <th className="p-6 text-right w-40">Số lượng</th>
                <th className="p-6 text-center w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={6} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></td></tr>
              ) : bomData.length > 0 ? (
                <SortableContext items={bomData.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  {bomData.map((item) => (
                    <SortableRow key={item.id} item={item} onDelete={handleDeleteBom} onUpdate={updateQuantity} />
                  ))}
                </SortableContext>
              ) : (
                <tr><td colSpan={6} className="p-20 text-center text-slate-300 font-bold uppercase text-[10px]">Chưa có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DndContext>

      {/* MODAL NHẬP NHANH */}
      {showAddBom && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-visible animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2.5rem]">
              <div className="flex flex-col">
                <span className="font-black text-slate-800 uppercase text-xs tracking-widest">Thiết lập định mức nhanh</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 italic">Gõ vào ô để tìm kiếm. Ctrl+V vào ô số lượng để dán từ Excel.</span>
              </div>
              <button onClick={() => setShowAddBom(false)} className="text-slate-400 hover:text-slate-800 transition-colors"><X size={20}/></button>
            </div>

            {/* Container Body Modal: overflow-x-visible là bắt buộc */}
            <div className="p-8 max-h-[60vh] overflow-y-auto overflow-x-visible relative custom-scrollbar">
              <table className="w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase">
                    <th className="px-4 text-left">Vật tư & SKU</th>
                    <th className="px-4 text-center w-24">ĐVT</th>
                    <th className="px-4 text-right w-40">Định mức/SP</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {newItems.map((item, idx) => {
                    const filteredOptions = catalog.filter(c => 
                        (c.material_name || c.name || "").toLowerCase().includes(item.tempSearch.toLowerCase()) ||
                        c.sku.toLowerCase().includes(item.tempSearch.toLowerCase())
                    ).slice(0, 50);

                    return (
                      <tr key={item.id} className="bg-slate-50 rounded-2xl">
                        <td className="p-3 relative min-w-[350px]">
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                            <input 
                              type="text"
                              placeholder="Tìm vật tư hoặc SKU..."
                              className="w-full pl-10 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-[11px] outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm"
                              value={item.tempSearch}
                              onFocus={() => setOpenDropdownIdx(idx)}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewItems(prev => prev.map((it, i) => i === idx ? { ...it, tempSearch: val } : it));
                                setOpenDropdownIdx(idx);
                              }}
                            />
                            <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-transform ${openDropdownIdx === idx ? 'rotate-180' : ''}`} size={14} />

                            {/* DROPDOWN KẾT QUẢ TÌM KIẾM - ĐÃ FIX CHE KHUẤT */}
                            {openDropdownIdx === idx && (
                              <>
                                <div className="fixed inset-0 z-[110]" onClick={() => setOpenDropdownIdx(null)} />
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden z-[120] max-h-64 overflow-y-auto border-t-4 border-t-emerald-500 animate-in fade-in slide-in-from-top-2 duration-200">
                                  {filteredOptions.length > 0 ? (
                                    filteredOptions.map(cat => (
                                      <div 
                                        key={cat.sku}
                                        className="px-4 py-3 hover:bg-emerald-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-none group"
                                        onClick={() => {
                                          setNewItems(prev => prev.map((it, i) => i === idx ? {
                                            ...it,
                                            material_sku: cat.sku,
                                            material_name: cat.material_name || cat.name,
                                            unit: cat.unit || 'kg',
                                            type: cat.category === 'Bao bì' ? 'Packaging' : 'Chemical',
                                            tempSearch: cat.material_name || cat.name
                                          } : it));
                                          setOpenDropdownIdx(null);
                                        }}
                                      >
                                        <div className="flex flex-col">
                                          <span className="text-[11px] font-black text-slate-700 group-hover:text-emerald-600 transition-colors">
                                            {cat.category === 'Bao bì' ? '📦' : '🧪'} {cat.material_name || cat.name}
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{cat.sku}</span>
                                        </div>
                                        <span className="text-[9px] bg-slate-100 px-2 py-1 rounded font-black text-slate-500 uppercase group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-all">
                                          {cat.unit}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-6 text-center text-[10px] font-bold text-slate-400 uppercase italic">Không tìm thấy vật tư khớp với từ khóa</div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-center">
                           <span className="text-[10px] font-black text-slate-400 uppercase bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm inline-block min-w-[60px]">
                             {item.unit || '...'}
                           </span>
                        </td>

                        <td className="p-3">
                          <input 
                            type="number" step="0.00001"
                            value={item.quantity}
                            onPaste={(e) => handlePasteQuantity(e, idx)}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setNewItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                            }}
                            className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl font-black text-blue-600 text-xs text-right outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all" 
                          />
                        </td>

                        <td className="p-3 text-center">
                          <button onClick={() => setNewItems(prev => prev.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-rose-500 transition-colors p-2">
                            <Trash2 size={16}/>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Khoảng trống cuối bảng để Dropdown dòng cuối cùng không bị che */}
                  <tr className="h-40 pointer-events-none"></tr>
                </tbody>
              </table>
              
              <button 
                onClick={() => setNewItems(prev => [...prev, { id: Date.now().toString(), tempSearch: '', material_sku: '', material_name: '', type: 'Chemical', unit: 'kg', quantity: 0 }])} 
                className="sticky bottom-0 bg-white/80 backdrop-blur-md mt-4 flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase hover:text-blue-800 transition-all px-4 py-2 rounded-full border border-blue-50 shadow-sm ml-2 w-fit"
              >
                <Plus size={14} className="bg-blue-100 rounded-full p-0.5" /> Thêm dòng mới
              </button>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4 rounded-b-[2.5rem]">
              <button onClick={() => setShowAddBom(false)} className="px-8 py-4 font-black text-[10px] uppercase text-slate-400 hover:text-slate-600">
                Hủy bỏ
              </button>
              <button 
                disabled={isSubmitting}
                onClick={handleBatchAddBom} 
                className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-700 disabled:bg-slate-300 flex items-center gap-2 transition-all active:scale-95"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : "Lưu định mức"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}