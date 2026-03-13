"use client";
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ShieldCheck, ShieldAlert, Clock } from 'lucide-react';

interface QRCodeStationProps {
  lot: any;
  materialName: string;
}

export default function QRCodeStation({ lot, materialName }: QRCodeStationProps) {
  const [mounted, setMounted] = useState(false);

  // Nhận diện linh hoạt: Dùng cho cả Material Lot và Production Batch
  const displayLotNumber = lot.lot_number || lot.batch_number || "N/A";
  const displayQty = lot.remaining_quantity ?? lot.available_qty ?? 0;
  const displayStatus = lot.status || lot.qc_status || 'Pending';

  // Chống lỗi Hydration trong Next.js
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-24 w-full bg-slate-50 animate-pulse rounded-2xl" />;

  const getStatusStyle = (statusStr: string) => {
    switch (statusStr) {
      case 'Passed': return { color: 'text-emerald-600', border: 'border-emerald-200', bg: 'bg-emerald-50', icon: <ShieldCheck size={14} /> };
      case 'Failed': return { color: 'text-rose-600', border: 'border-rose-200', bg: 'bg-rose-50', icon: <ShieldAlert size={14} /> };
      default: return { color: 'text-amber-600', border: 'border-amber-200', bg: 'bg-amber-50', icon: <Clock size={14} /> };
    }
  };

  const style = getStatusStyle(displayStatus);
  const qrColor = displayStatus === 'Passed' ? '#059669' : (displayStatus === 'Failed' ? '#e11d48' : '#334155');

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <style>
            @page { size: 50mm 30mm; margin: 0; }
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 4px; display: flex; align-items: center; }
            .container { display: flex; width: 100%; align-items: center; border: 1px solid #eee; padding: 2px; }
            .qr-box { margin-right: 6px; }
            .info { flex: 1; min-width: 0; }
            .lot-title { font-size: 10px; font-weight: 900; color: ${qrColor}; }
            .name { font-size: 8px; font-weight: bold; margin: 1px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .date { font-size: 7px; color: #555; line-height: 1.2; }
            .qty { font-size: 8px; font-weight: bold; color: #2563eb; margin-top: 1px; }
            .status-tag { font-size: 7px; font-weight: bold; border: 0.5px solid ${qrColor}; color: ${qrColor}; padding: 0px 3px; display: inline-block; margin-top: 2px; border-radius: 2px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div id="qrcode" class="qr-box"></div>
            <div class="info">
              <div class="lot-title">LOT: ${displayLotNumber}</div>
              <div class="name">${materialName}</div>
              <div class="date">NSX: ${lot.mfg_date || '--'}</div>
              <div class="date">HSD: ${lot.exp_date || '--'}</div>
              <div class="qty">SL: ${displayQty.toLocaleString()}</div>
              <div class="status-tag">${displayStatus.toUpperCase()}</div>
            </div>
          </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
          <script>
            new QRCode(document.getElementById("qrcode"), {
              text: "${displayLotNumber}",
              width: 75,
              height: 75,
              colorDark: "${qrColor}"
            });
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className={`bg-white p-4 rounded-2xl border ${style.border} flex gap-4 items-center shadow-sm hover:shadow-md transition-all group`}>
      {/* QR Code hiển thị trên web */}
      <div className="bg-white p-1.5 border rounded-lg shadow-inner group-hover:border-blue-200 transition-colors">
        <QRCodeSVG 
          value={displayLotNumber}
          size={64}
          fgColor={qrColor}
          level="H"
        />
      </div>

      {/* Thông tin hiển thị trên web */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`px-2 py-0.5 rounded text-[9px] font-black flex items-center gap-1 ${style.bg} ${style.color}`}>
            {style.icon} {displayStatus}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">#{displayLotNumber}</span>
        </div>
        
        <p className="text-sm font-black text-slate-700 truncate mb-0.5">{materialName}</p>
        
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] text-blue-600 font-black flex items-center gap-1">
            <Package size={10} /> Còn tồn: {displayQty.toLocaleString()}
          </p>
          <p className="text-[9px] text-slate-400 italic">HSD: {lot.exp_date || 'Không xác định'}</p>
        </div>
      </div>

      {/* Nút in tem */}
      <button 
        onClick={handlePrint}
        className="p-3 bg-slate-900 text-white hover:bg-blue-600 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center"
        title="In tem nhiệt 50x30mm"
      >
        <Printer size={18} />
      </button>
    </div>
  );
}

// Icon Package bổ sung để giao diện đẹp hơn
function Package({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7.5V16c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7.5" />
      <polyline points="3 7.5 12 13 21 7.5" />
      <polyline points="12 22.5 12 13" />
      <polyline points="3 7.5 12 2 21 7.5" />
    </svg>
  );
}