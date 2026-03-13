import { X } from 'lucide-react';

export const HistoryModal = ({ device, onClose }: { device: any, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase">Lịch sử thiết bị</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{device.device_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500"><X /></button>
        </div>
        <div className="overflow-y-auto pr-2 space-y-4">
          {(!device.part_replacement_history || device.part_replacement_history.length === 0) ? (
            <div className="text-center py-10 text-slate-300 italic text-sm font-bold">Chưa có dữ liệu bảo trì</div>
          ) : (
            [...device.part_replacement_history].reverse().map((item: any) => (
              <div key={item.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
                <div className="flex justify-between mb-1 text-xs font-black text-slate-700 uppercase">
                  <span>{item.name}</span>
                  <span className="text-[9px] text-slate-400">{item.date}</span>
                </div>
                <p className="text-[9px] text-slate-400">Kỹ thuật: {item.technician}</p>
              </div>
            ))
          )}
        </div>
        <button onClick={onClose} className="mt-6 w-full py-4 bg-slate-900 text-white font-black rounded-2xl uppercase text-xs">Đóng</button>
      </div>
    </div>
  );
};