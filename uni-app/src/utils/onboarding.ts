import { getUserProfile } from "@/api/user";
import { ONBOARDING_DONE_KEY } from "@/types/auth";
import { useUserStore } from "@/stores/user";
import { getStorageJson, setStorageJson } from "@/utils/storage";

/**
 * 判断当前用户是否需要新手引导
 * 依据 public.users.onboarding_completed 字段
 */
export async function needsOnboarding(): Promise<boolean> {
  const profile = await getUserProfile();
  if (!profile) return true;
  return !profile.onboarding_completed;
}

/** 读取本地引导完成缓存（按 userId） */
export function getLocalOnboardingDone(userId: string | null): boolean {
  if (!userId) return false;
  try {
    const map = getStorageJson<Record<string, boolean>>(ONBOARDING_DONE_KEY);
    return map?.[userId] === true;
  } catch {
    return false;
  }
}

/** 写入本地引导完成缓存 */
export function setLocalOnboardingDone(userId: string, done: boolean): void {
  const map = getStorageJson<Record<string, boolean>>(ONBOARDING_DONE_KEY) ?? {};
  if (done) {
    map[userId] = true;
  } else {
    delete map[userId];
  }
  setStorageJson(ONBOARDING_DONE_KEY, map);
}

/**
 * 确保用户已完成新手引导
 * 未完成则跳转引导页，返回 false
 */
export async function ensureOnboarded(): Promise<boolean> {
  const userStore = useUserStore();

  if (!userStore.isLoggedIn) {
    uni.reLaunch({ url: "/pages/login/index" });
    return false;
  }

  // 内存里已有完成标记
  if (userStore.profile?.onboarding_completed) {
    return true;
  }

  // 本地已标记完成：先放行，后台静默补档案，避免每个页面 onShow 都打接口
  if (getLocalOnboardingDone(userStore.userId)) {
    if (!userStore.profile) {
      void userStore.fetchProfile().catch(() => null);
    }
    return true;
  }

  const profile = await userStore.fetchProfile();

  if (profile?.onboarding_completed) {
    setLocalOnboardingDone(userStore.userId ?? "", true);
    return true;
  }

  // 网络拉档案失败时：若本地已标记完成，不强制回引导页
  if (!profile && getLocalOnboardingDone(userStore.userId)) {
    console.warn("[onboarding] 档案拉取失败，使用本地已完成缓存");
    return true;
  }

  if (!profile?.onboarding_completed) {
    uni.redirectTo({ url: "/pages/onboarding/index" });
    return false;
  }

  return true;
}

/** 跳转到新手引导页 */
export function redirectToOnboarding(): void {
  uni.redirectTo({ url: "/pages/onboarding/index" });
}

/** 跳转到首页 */
export function redirectToHome(): void {
  uni.reLaunch({ url: "/pages/index/index" });
}
