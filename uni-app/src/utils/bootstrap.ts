import { useUserStore } from "@/stores/user";
import { closeSplashscreen } from "@/utils/splash";
import { ensureHealthKitAuthState } from "@/lib/healthkit";

/** 应用启动：先同步恢复本地会话，再后台续期 */
export async function bootstrapApp(): Promise<void> {
  ensureHealthKitAuthState();
  const userStore = useUserStore();
  userStore.hydrateFromStorageSync();
  if (userStore.sessionRestored) return;

  try {
    await userStore.restoreSession();
  } catch (error) {
    console.error("[bootstrap] restoreSession failed:", error);
  } finally {
    userStore.markSessionRestored();
    closeSplashscreen();
  }
}
