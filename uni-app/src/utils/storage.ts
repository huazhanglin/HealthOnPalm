/**
 * uni-app 存储适配器
 * 供 Supabase Auth 在小程序 / H5 环境持久化 Session
 */
export const uniAuthStorage = {
  getItem(key: string): string | null {
    try {
      const value = uni.getStorageSync(key);
      return value ? String(value) : null;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    uni.setStorageSync(key, value);
  },
  removeItem(key: string): void {
    uni.removeStorageSync(key);
  },
};

/** 读取 JSON 格式的本地存储 */
export function getStorageJson<T>(key: string): T | null {
  const raw = uniAuthStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** 写入 JSON 到本地存储 */
export function setStorageJson(key: string, value: unknown): void {
  uniAuthStorage.setItem(key, JSON.stringify(value));
}

/** 显示 Toast 错误提示；未登录类错误会跳转登录页 */
export function showErrorToast(message: string): void {
  if (/未登录|请先登录|请重新登录/i.test(message)) {
    void import("@/utils/auth-session").then(({ redirectToLogin }) => {
      redirectToLogin(
        /过期|expired/i.test(message) ? "登录已过期，请重新登录" : "请先登录"
      );
    });
    return;
  }

  uni.showToast({
    title: message,
    icon: "none",
    duration: 2500,
  });
}

/** 显示加载中 */
export function showLoading(title = "加载中..."): void {
  uni.showLoading({ title, mask: true });
}

/** 隐藏加载中 */
export function hideLoading(): void {
  uni.hideLoading();
}
