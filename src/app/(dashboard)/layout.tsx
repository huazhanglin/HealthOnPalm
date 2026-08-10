import { Navbar } from "@/components/layout/Navbar";

/**
 * Dashboard 路由组布局
 * 为首页及后续仪表盘页面提供统一的导航栏与内容容器
 */
export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
