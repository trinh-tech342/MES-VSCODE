import { X } from 'lucide-react';

interface AddDeviceModalProps {
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const AddDeviceModal = ({ onClose, onSubmit }: AddDeviceModalProps) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800 uppercase">Thêm Máy Mới</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
          <input name="name" placeholder="Tên thiết bị" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500" />
          <input name="code" placeholder="Mã máy (Code)" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500" />
          <input name="location" placeholder="Vị trí lắp đặt" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500" />
          <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase text-xs shadow-lg hover:bg-blue-700 transition-all">
            Lưu thiết bị
          </button>
        </form>
      </div>
    </div>
  );
};