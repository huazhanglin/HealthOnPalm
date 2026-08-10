/**
 * 顶部导航栏
 * 显示应用品牌名称，后续可扩展用户菜单与通知入口
 */
export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-3xl items-center px-4 sm:px-6">
        <div className="flex items-center gap-2">
          {/* 品牌图标占位 */}
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
            aria-hidden
          >
            H
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Health Agent
          </span>
        </div>
      </div>
    </header>
  );
}
