import { Wrench, CheckCircle2, X } from 'lucide-react';

interface RepairModalProps {
  device: any;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const RepairModal = ({ device, onClose, onSubmit }: RepairModalProps) => {
  if (!device) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all">
      {/* Modal Container với animation scale nhẹ */}
      <div className="bg-white w-full max-w-md rounded-[3rem] p-1 shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div className="p-8">
          {/* Icon Header */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-200 blur-xl opacity-50 rounded-full"></div>
              <div className="relative bg-emerald-50 text-emerald-600 p-5 rounded-[2rem] border-4 border-white shadow-sm">
                <Wrench size={32} />
              </div>
            </div>
          </div>

          {/* Title Section */}
          <div className="text-center mb-8">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Hoàn tất sửa chữa</h3>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                {device.device_code}
              </span>
              <span className="text-slate-400 font-bold text-sm">—</span>
              <span className="text-slate-600 font-bold text-sm uppercase">{device.device_name}</span>
            </div>
          </div>
          
          <form onSubmit={onSubmit} className="space-y-6" autoComplete="off">
            {/* Input Group */}
            <div className="space-y-2">
              <label className="ml-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi tiết bảo trì</label>
              <textarea 
                name="partName" 
                placeholder="Ví dụ: Thay dây curoa mới, vệ sinh trục quay..." 
                required 
                autoFocus
                rows={3}
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] outline-none focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium resize-none" 
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button 
                type="submit" 
                className="w-full py-5 bg-slate-900 hover:bg-emerald-600 text-white font-black rounded-[2rem] uppercase text-xs shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-2 group"
              >
                <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
                Xác nhận máy đã chạy tốt
              </button>
              
              <button 
                type="button" 
                onClick={onClose} 
                className="w-full py-4 text-slate-400 text-[10px] font-black uppercase hover:text-red-500 transition-colors"
              >
                Hủy bỏ và quay lại
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};