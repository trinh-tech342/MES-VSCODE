"use client";
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download } from 'lucide-react';

export default function BatchQRCode({ batch }: { batch: any }) {
  const downloadQR = () => {
    const svg = document.getElementById(`qr-${batch.batch_id}`);
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QR_${batch.batch_id}.png`;
        downloadLink.href = `${pngFile}`;
        downloadLink.click();
      };
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    }
  };

  return (
    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm inline-flex flex-col items-center gap-4">
      {/* Vùng in nhãn */}
      <div id="print-area" className="flex flex-col items-center p-2 bg-white border border-dashed border-slate-300 rounded-xl">
        <QRCodeSVG 
          id={`qr-${batch.batch_id}`}
          value={batch.batch_id} // Nội dung mã QR là Batch ID
          size={120}
          level={"H"} // Độ sửa lỗi cao (High) để nhãn dù bẩn vẫn quét được
          includeMargin={true}
        />
        <div className="text-center mt-2">
          <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{batch.batch_id}</p>
          <p className="text-[8px] font-bold text-slate-400 uppercase">{batch.sku}</p>
        </div>
      </div>

      {/* Nút thao tác */}
      <div className="flex gap-2">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-indigo-600 transition-all"
        >
          <Printer size={14} /> In nhãn
        </button>
        <button 
          onClick={downloadQR}
          className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
        >
          <Download size={14} />
        </button>
      </div>
    </div>
  );
}