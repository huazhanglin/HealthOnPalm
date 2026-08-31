/** 原生 tabBar 页面路径（必须用 uni.switchTab，不能 redirectTo） */
export const TAB_PAGE_PATHS = [
  "/pages/index/index",
  "/pages/chat/index",
  "/pages/workout/plan",
  "/pages/records/index",
  "/pages/profile/index",
] as const;

export type TabPagePath = (typeof TAB_PAGE_PATHS)[number];

/** 跳转到底部 Tab 页（关闭其上的普通页） */
export function switchToTab(url: TabPagePath): void {
  uni.switchTab({ url });
}
