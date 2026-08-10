let splashClosed = false;

/** 关闭 App 启动页 */
export function closeSplashscreen(): void {
  // #ifdef APP-PLUS
  if (splashClosed) return;

  const close = (): void => {
    if (splashClosed) return;
    try {
      plus.navigator.closeSplashscreen();
      splashClosed = true;
      console.log("[splash] closed");
    } catch (error) {
      console.warn("[splash] close failed:", error);
    }
  };

  if (typeof plus !== "undefined") {
    close();
    return;
  }

  document.addEventListener("plusready", close, { once: true });
  setTimeout(close, 300);
  setTimeout(close, 1000);
  // #endif
}
