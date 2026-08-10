import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/** 站点元数据 */
export const metadata: Metadata = {
  title: "Health On Palm — 健康智能体",
  description: "基于 AI 的个性化健康建议助手",
};

/**
 * 根布局组件
 * 包裹整个应用，提供全局字体与 HTML 结构
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} antialiased`}>{children}</body>
    </html>
  );
}
