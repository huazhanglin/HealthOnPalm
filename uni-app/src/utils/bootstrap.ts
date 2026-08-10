import { useUserStore } from "@/stores/user";
import { closeSplashscreen } from "@/utils/splash";
import { ensureHealthKitAuthState } from "@/lib/healthkit";

/** 应用启动：恢复会话（不阻塞首屏） */
export async function bootstrapApp(): Promise<void> {
  ensureHealthKitAuthState();
  const userStore = useUserStore();
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
