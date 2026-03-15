import type { Metadata } from "next";
// 1. Đổi Geist thành Inter
import { Inter } from "next/font/google"; 
import "./globals.css";

// 2. Cấu hình font Inter hỗ trợ tiếng Việt
const inter = Inter({
  subsets: ["latin", "vietnamese"], // Bắt buộc phải có vietnamese ở đây
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Hệ thống MES - Quản lý sản xuất",
  description: "Giải pháp quản lý sản xuất thông minh",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full">
      <body className={`${inter.variable} font-sans antialiased min-h-screen w-full overflow-x-hidden`}>
        {children}
      </body>
    </html>
  );
}

