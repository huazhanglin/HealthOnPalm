import { useUserStore } from "@/stores/user";
import { clearHealthKitSetup, shouldPromptHealthKitAuth } from "@/lib/healthkit";
import {
  getLocalOnboardingDone,
  setLocalOnboardingDone,
} from "@/utils/onboarding";

let routingInFlight: Promise<void> | null = null;

/** 已登录用户从登录入口跳转到合适页面 */
export async function routeAuthedUserFromLogin(): Promise<void> {
  if (routingInFlight) return routingInFlight;
  routingInFlight = routeAuthedUserFromLoginOnce().finally(() => {
    routingInFlight = null;
  });
  return routingInFlight;
}

async function routeAuthedUserFromLoginOnce(): Promise<void> {
  const userStore = useUserStore();
  if (!userStore.isLoggedIn) return;

  const { ensureAccessToken } = await import("@/utils/auth-session");
  const token = await ensureAccessToken();
  if (!token) return;

  // 内存档案或本地引导缓存：立刻进首页，档案后台补
  if (
    userStore.profile?.onboarding_completed ||
    getLocalOnboardingDone(userStore.userId)
  ) {
    if (!userStore.profile) {
      void userStore.fetchProfile().catch(() => null);
    }
    routeAfterOnboardingGate();
    return;
  }

  const profile = await userStore.fetchProfile().catch(() => null);

  if (profile?.onboarding_completed) {
    if (userStore.userId) {
      setLocalOnboardingDone(userStore.userId, true);
    }
    routeAfterOnboardingGate();
    return;
  }

  if (!profile && getLocalOnboardingDone(userStore.userId)) {
    console.warn("[auth-routing] 档案拉取失败，使用本地引导完成缓存");
    routeAfterOnboardingGate();
    return;
  }

  uni.reLaunch({ url: "/pages/onboarding/index" });
}

function routeAfterOnboardingGate(): void {
  // #ifdef APP-PLUS
  if (shouldPromptHealthKitAuth()) {
    uni.reLaunch({ url: "/pages/healthkit/authorize?from=first" });
    return;
  }
  // #endif

  uni.reLaunch({ url: "/pages/index/index" });
}

/** 新手引导完成后：优先 HealthKit 授权（iOS 真机） */
export function routeAfterOnboarding(): void {
  // #ifdef APP-PLUS
  if (shouldPromptHealthKitAuth()) {
    uni.reLaunch({ url: "/pages/healthkit/authorize?from=first" });
    return;
  }
  // #endif

  uni.reLaunch({ url: "/pages/index/index" });
}

/** 清除 HealthKit 授权标记（调试用） */
export function clearHealthKitAuthFlag(): void {
  clearHealthKitSetup();
}
