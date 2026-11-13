import type { Metadata } from "next";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nền tảng Tuyển dụng CV",
  description: "Công cụ nội bộ quản lý và tìm kiếm ứng viên cho đội ngũ tuyển dụng.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
