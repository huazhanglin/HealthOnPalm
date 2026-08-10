import { useUserStore } from "@/stores/user";
import { clearHealthKitSetup, shouldPromptHealthKitAuth } from "@/lib/healthkit";
import {
  getLocalOnboardingDone,
  setLocalOnboardingDone,
} from "@/utils/onboarding";

/** 已登录用户从登录入口跳转到合适页面 */
export async function routeAuthedUserFromLogin(): Promise<void> {
  const userStore = useUserStore();
  if (!userStore.isLoggedIn) return;

  // 内存缓存优先
  if (userStore.profile?.onboarding_completed) {
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

  // 档案拉取失败但本地已标记完成 → 不重复走欢迎页
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
