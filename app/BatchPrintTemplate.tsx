import React from 'react';

export const BatchPrintTemplate = ({ lot }: { lot: any }) => {
  if (!lot) return null;

  // Tạo nội dung mã QR (Ví dụ: quét để xem link hồ sơ hoặc thông tin lô)
  const qrValue = `LOT:${lot.id}|SKU:${lot.sku}|QTY:${lot.qty}|STATUS:PASSED`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrValue)}`;

  return (
    <div 
      id="print-area" 
      className="hidden print:block bg-white text-black font-serif"
      style={{
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        padding: '15mm',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '100%', display: 'block' }}>
        
        {/* Header với Logo và QR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid black', paddingBottom: '15px', marginBottom: '30px' }}>
          {/* Logo Công ty (Thay URL logo của bạn vào đây) */}
          <div style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #ccc' }}>
            <span style={{ fontSize: '10px', color: '#666' }}>LOGO</span>
          </div>

          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>Hồ Sơ Lô Sản Xuất</h1>
            <p style={{ fontSize: '14px', fontStyle: 'italic', fontFamily: 'sans-serif', margin: '5px 0' }}>Production Batch Record</p>
          </div>

          {/* Mã QR Code để truy xuất nguồn gốc */}
          <div style={{ textAlign: 'center' }}>
            <img src={qrUrl} alt="QR Code" style={{ width: '70px', height: '70px' }} />
            <p style={{ fontSize: '8px', marginTop: '2px', fontFamily: 'sans-serif' }}>{lot.id}</p>
          </div>
        </div>

        {/* Thông tin biểu mẫu (Nằm nhỏ phía trên bảng) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '9px', marginBottom: '10px', fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'right' }}>
            <p>Mã biểu mẫu: BM-SX-01</p>
            <p>Số soát xét: 02 (06/03/2026)</p>
          </div>
        </div>

        {/* Thông tin chung */}
        <table style={{ width: '100%', marginBottom: '30px', borderCollapse: 'collapse', fontSize: '14px' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                <span style={{ fontWeight: 'bold', width: '120px', display: 'inline-block' }}>SỐ LÔ (LOT):</span>
                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{lot.id}</span>
              </td>
              <td style={{ width: '50%', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                <span style={{ fontWeight: 'bold', width: '120px', display: 'inline-block' }}>NGÀY SX:</span>
                <span>{new Date().toLocaleDateString('vi-VN')}</span>
              </td>
            </tr>
            <tr>
              <td style={{ width: '50%', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                <span style={{ fontWeight: 'bold', width: '120px', display: 'inline-block' }}>MÃ HÀNG (SKU):</span>
                <span style={{ fontWeight: 'bold' }}>{lot.sku}</span>
              </td>
              <td style={{ width: '50%', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                <span style={{ fontWeight: 'bold', width: '120px', display: 'inline-block' }}>SẢN LƯỢNG:</span>
                <span>{lot.qty} PCS</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Bảng kết quả QC */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid black', marginBottom: '40px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', textTransform: 'uppercase', fontSize: '11px' }}>
              <th style={{ border: '1px solid black', padding: '10px', width: '50px' }}>STT</th>
              <th style={{ border: '1px solid black', padding: '10px', textAlign: 'left' }}>Nội dung kiểm tra</th>
              <th style={{ border: '1px solid black', padding: '10px', width: '180px' }}>Tiêu chuẩn xét duyệt</th>
              <th style={{ border: '1px solid black', padding: '10px', width: '120px' }}>Kết quả</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '12px' }}>
            {[
              { n: "Kiểm tra ngoại quan", s: "Không trầy xước, đúng màu", r: "ĐẠT" },
              { n: "Kích thước kỹ thuật", s: "Dung sai ± 0.05mm", r: "ĐẠT" },
              { n: "Trọng lượng tịnh", s: "Đúng định mức sản phẩm", r: "ĐẠT" },
              { n: "Thử nghiệm độ bền", s: "Lực kéo > 150N", r: "ĐẠT" },
              { n: "Quy cách đóng gói", s: "Đủ số lượng, đúng tem nhãn", r: "ĐẠT" },
            ].map((item, i) => (
              <tr key={i} style={{ height: '45px' }}>
                <td style={{ border: '1px solid black', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ border: '1px solid black', padding: '0 10px' }}>{item.n}</td>
                <td style={{ border: '1px solid black', textAlign: 'center' }}>{item.s}</td>
                <td style={{ border: '1px solid black', textAlign: 'center', fontWeight: 'bold' }}>{item.r}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Chữ ký xác nhận */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px', textAlign: 'center', fontSize: '13px' }}>
          <div style={{ width: '30%' }}>
            <p style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Người Kiểm Tra</p>
            <div style={{ height: '100px' }}></div>
            <p style={{ fontWeight: 'bold' }}>Nguyễn Văn QC</p>
          </div>
          <div style={{ width: '30%' }}>
            <p style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Quản Lý Sản Xuất</p>
            <div style={{ height: '100px' }}></div>
            <p style={{ fontWeight: 'bold' }}>Trần Trưởng Ca</p>
          </div>
          <div style={{ width: '30%' }}>
            <p style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Giám Đốc Nhà Máy</p>
            <div style={{ height: '100px' }}></div>
            <p>................................</p>
          </div>
        </div>

        {/* Footer ghi chú hệ thống */}
        <div style={{ position: 'absolute', bottom: '15mm', left: '15mm', right: '15mm', borderTop: '1px solid #eee', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666', fontStyle: 'italic' }}>
          <span>Hệ thống quản lý sản xuất MES v2.0 - Xác nhận điện tử</span>
          <span>Trang 1 / 1</span>
        </div>
      </div>
    </div>
  );
};