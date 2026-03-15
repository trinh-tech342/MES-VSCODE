"use client";
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const QC_METRICS_MASTER = [
  { id: 'moisture', label: 'Độ ẩm', unit: '%' },
  { id: 'ph', label: 'Độ pH', unit: 'pH' },
  { id: 'brix', label: 'Độ Brix', unit: '°Bx' },
  { id: 'solubility', label: 'Độ tan', unit: '' }
];

export default function QCModal({ batch, step, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [metricValues, setMetricValues] = useState<any>({});
  const [isPassed, setIsPassed] = useState<boolean | null>(null);

  const handleSave = async () => {
    // Kiểm tra chặn nếu chưa chọn Đạt/Không đạt
    if (isPassed === null) {
      alert("Vui lòng xác nhận kết quả ĐẠT hoặc KHÔNG ĐẠT trước khi lưu!");
      return;
    }

    setLoading(true);
    try {
      // 1. Lưu vào bảng qc_logs để làm lịch sử (COA)
      const { error: logError } = await supabase.from('qc_logs').insert([{ 
        batch_id: batch.id, 
        lot_number: batch.batch_id, 
        type: 'PQC', 
        metrics: metricValues, 
        status: isPassed, 
        product_id: batch.product_id 
      }]);

      if (logError) throw logError;

      // 2. Cập nhật trực tiếp vào ghi chú công đoạn để hiển thị ở màn hình chính
      const qcStatusText = isPassed ? 'ĐẠT' : 'K.ĐẠT';
      const { error: stepError } = await supabase.from('production_steps')
        .update({ 
          notes: `[QC: ${qcStatusText}] ${Object.entries(metricValues).map(([k, v]) => `${k}:${v}`).join(', ')}` 
        })
        .eq('id', step.id);

      if (stepError) throw stepError;

      onSuccess(); // Gọi fetchData(false) ở component cha
      onClose();   // Đóng modal
    } catch (error: any) {
      alert("Lỗi lưu dữ liệu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
          <div>
            <h3 className="font-black text-[10px] uppercase text-slate-400 leading-none mb-1">Kiểm tra chất lượng</h3>
            <p className="font-black text-xs text-indigo-600 uppercase italic">{batch.batch_id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-8 space-y-5">
          {/* Nhập các chỉ số */}
          <div className="space-y-3">
            {QC_METRICS_MASTER.map(m => (
              <div key={m.id} className="flex items-center gap-3">
                <span className="text-[10px] font-black w-24 text-slate-500 uppercase">{m.label}</span>
                <div className="relative flex-1">
                  <input 
                    type="text"
                    placeholder={m.unit}
                    className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                    onChange={e => setMetricValues({...metricValues, [m.label]: e.target.value})}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Nút Đạt/Không đạt lớn */}
          <div className="pt-4 border-t border-dashed space-y-3">
            <p className="text-[9px] font-black text-center text-slate-400 uppercase tracking-[0.2em]">Kết luận</p>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setIsPassed(true)}
                className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-1 transition-all ${isPassed === true ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-400'}`}
              >
                <CheckCircle size={20} />
                <span className="text-[10px] font-black uppercase">ĐẠT</span>
              </button>
              <button 
                type="button"
                onClick={() => setIsPassed(false)}
                className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-1 transition-all ${isPassed === false ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' : 'bg-slate-50 text-slate-400'}`}
              >
                <AlertCircle size={20} />
                <span className="text-[10px] font-black uppercase">K.ĐẠT</span>
              </button>
            </div>
          </div>

          {/* Nút LƯU chính */}
          <button 
            disabled={loading || isPassed === null}
            onClick={handleSave}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 disabled:opacity-20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {loading ? 'Đang lưu dữ liệu...' : 'Xác nhận & Lưu kết quả'}
          </button>
        </div>
      </div>
    </div>
  );
}