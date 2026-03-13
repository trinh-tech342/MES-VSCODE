import { AlertCircle, History, Wrench } from 'lucide-react';

interface DeviceCardProps {
  device: any;
  isBroken: boolean;
  onReport: (id: string) => void;
  onRepair: (device: any) => void;
  onViewHistory: (device: any) => void;
}

export const DeviceCard = ({ device, isBroken, onReport, onRepair, onViewHistory }: DeviceCardProps) => {
  if (isBroken) {
    return (
      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border-l-4 border-l-red-500 border-slate-100">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-50 text-red-600"><AlertCircle size={20} /></div>
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase leading-tight">{device.device_name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{device.device_code}</p>
            </div>
          </div>
          <button onClick={() => onViewHistory(device)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
            <History size={18} />
          </button>
        </div>
        <button 
          onClick={() => onRepair(device)}
          className="w-full py-3 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase hover:bg-emerald-600 transition-all shadow-lg"
        >
          <Wrench size={14} className="inline mr-2" /> Sửa xong & Phục hồi
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-3xl border border-slate-100 flex flex-col justify-between hover:border-red-200 transition-colors group relative">
      <button 
        onClick={() => onViewHistory(device)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-slate-900 transition-all"
      >
        <History size={14} />
      </button>
      <div>
        <p className="font-black text-slate-800 text-[11px] uppercase truncate pr-6">{device.device_name}</p>
        <p className="text-[9px] text-slate-400 font-bold mb-3">{device.device_code}</p>
      </div>
      <button 
        onClick={() => onReport(device.id)}
        className="w-full py-2 bg-slate-50 text-slate-400 group-hover:bg-red-50 group-hover:text-red-600 rounded-xl text-[9px] font-black uppercase transition-all"
      >
        Báo hỏng
      </button>
    </div>
  );
};