import { defineStore } from "pinia";
import { computed, ref } from "vue";
// #ifdef APP-PLUS
import { signInWithEmail, signUpWithEmail } from "@/api/supabase-auth";
// #endif
import { getUserProfile } from "@/api/user";
import {
  AUTH_STORAGE_KEY,
  type AuthErrorInfo,
  type StoredAuthSession,
} from "@/types/auth";
import type { User } from "@/types/database";
import { useHomeStore } from "@/stores/home";
import { isValidEmail, isValidPassword } from "@/utils/email";
import { getStorageJson, setStorageJson, uniAuthStorage } from "@/utils/storage";

/** 将 Supabase 错误映射为中文提示 */
function toAuthError(error: { message: string; code?: string }): AuthErrorInfo {
  const code = error.code;
  const message = error.message || "";

  if (
    code === "invalid_credentials" ||
    code === "invalid_grant" ||
    /invalid login credentials|invalid_credentials/i.test(message)
  ) {
    return { message: "邮箱或密码不正确", code: code ?? "invalid_credentials" };
  }
  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    /already registered|already been registered|user already/i.test(message)
  ) {
    return { message: "该邮箱已注册，请直接登录", code: code ?? "email_exists" };
  }
  if (
    code === "email_not_confirmed" ||
    /email not confirmed|confirm your email/i.test(message)
  ) {
    return {
      message: "请先确认邮箱，或在 Supabase 关闭 Confirm email（内测推荐）",
      code: code ?? "email_not_confirmed",
    };
  }
  if (code === "email_confirmation_required") {
    return { message, code };
  }
  if (/password/i.test(message) && /at least|too short|weak/i.test(message)) {
    return { message: "密码至少 6 位", code };
  }

  return { message: message || "操作失败，请稍后重试", code };
}

function mapThrownError(error: unknown): AuthErrorInfo {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    (error as { name?: string }).name === "AuthRequestError"
  ) {
    const authError = error as { message: string; code?: string };
    return toAuthError({ message: authError.message, code: authError.code });
  }
  if (error instanceof Error) {
    return toAuthError({ message: error.message });
  }
  return toAuthError({ message: "操作失败，请稍后重试" });
}

function sessionFromAuth(
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at?: number;
    user: { id: string; email?: string; phone?: string };
  },
  fallbackEmail: string
): StoredAuthSession {
  return {
    userId: session.user.id,
    email: session.user.email ?? fallbackEmail,
    phone: session.user.phone,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt:
      session.expires_at ??
      Math.floor(Date.now() / 1000) + (session.expires_in || 3600),
  };
}

/**
 * 用户认证 Pinia Store
 * iOS App 使用 Supabase Auth REST；H5 使用 supabase-js
 */
export const useUserStore = defineStore("user", () => {
  const email = ref<string | null>(null);
  /** @deprecated 兼容旧字段；展示请用 email / nickname */
  const phone = ref<string | null>(null);
  const userId = ref<string | null>(null);
  const profile = ref<User | null>(null);
  const isLoading = ref(false);
  const sessionRestored = ref(false);
  const isLoggedIn = computed(() => !!userId.value);

  function markSessionRestored(): void {
    sessionRestored.value = true;
  }

  function applyStoredSession(stored: StoredAuthSession): void {
    userId.value = stored.userId;
    email.value = stored.email || stored.phone || null;
    phone.value = stored.phone ?? null;
  }

  /**
   * 同步读本地 token，立刻认已登录（不打网络）。
   * 启动页据此直接进首页，避免先画出登录表单。
   */
  function hydrateFromStorageSync(): boolean {
    if (userId.value) return true;
    const stored = getStorageJson<StoredAuthSession>(AUTH_STORAGE_KEY);
    if (!stored?.userId || !stored.accessToken || !stored.refreshToken) {
      return false;
    }
    applyStoredSession(stored);
    return true;
  }

  /** 从本地存储恢复会话（必要时自动 refresh） */
  async function restoreSession(): Promise<void> {
    try {
      const { ensureAccessToken, readStoredAuthSession } = await import(
        "@/utils/auth-session"
      );
      const token = await ensureAccessToken();
      const stored = readStoredAuthSession();
      if (!token || !stored) return;

      // #ifdef APP-PLUS
      applyStoredSession(stored);
      // #endif

      // #ifdef H5
      const { supabase } = await import("@/api/supabase");
      const { withTimeout } = await import("@/api/uni-fetch");
      try {
        const { error } = await withTimeout(
          supabase.auth.setSession({
            access_token: stored.accessToken,
            refresh_token: stored.refreshToken,
          }),
          3000,
          "恢复会话超时"
        );
        if (error) {
          console.error("[userStore] 恢复会话失败:", error.message);
          uniAuthStorage.removeItem(AUTH_STORAGE_KEY);
          return;
        }
        applyStoredSession(stored);
      } catch (error) {
        console.warn("[userStore] 恢复会话异常:", error);
        uniAuthStorage.removeItem(AUTH_STORAGE_KEY);
      }
      // #endif
    } finally {
      markSessionRestored();
    }
  }

  async function fetchProfile(): Promise<User | null> {
    const data = await getUserProfile();
    profile.value = data;
    return data;
  }

  function persistSession(session: StoredAuthSession): void {
    setStorageJson(AUTH_STORAGE_KEY, session);
    applyStoredSession(session);
  }

  function clearLocalAuthState(): void {
    uniAuthStorage.removeItem(AUTH_STORAGE_KEY);
    email.value = null;
    phone.value = null;
    userId.value = null;
    profile.value = null;
    useHomeStore().clear();
    void import("@/stores/chat").then(({ useChatStore }) => {
      useChatStore().reset();
    });
    void import("@/stores/workout").then(({ useWorkoutStore }) => {
      useWorkoutStore().reset();
    });
  }

  /** 邮箱注册并登录（Confirm email 关闭时可直接进会话） */
  async function register(emailInput: string, password: string): Promise<boolean> {
    const normalized = emailInput.trim().toLowerCase();
    if (!isValidEmail(normalized)) {
      throw toAuthError({ message: "请输入有效的邮箱地址" });
    }
    if (!isValidPassword(password)) {
      throw toAuthError({ message: "密码至少 6 位" });
    }

    isLoading.value = true;
    try {
      clearLocalAuthState();

      // #ifdef APP-PLUS
      const session = await signUpWithEmail(normalized, password);
      if (!session.access_token || !session.user?.id) {
        throw toAuthError({ message: "注册成功但未获取到用户信息" });
      }
      persistSession(sessionFromAuth(session, normalized));
      // #endif

      // #ifdef H5
      const { supabase } = await import("@/api/supabase");
      const { data, error } = await supabase.auth.signUp({
        email: normalized,
        password,
      });
      if (error) throw toAuthError(error);
      if (!data.session || !data.user?.id) {
        throw toAuthError({
          message:
            "注册成功，但需要邮箱确认后才能登录。内测请在 Supabase 关闭 Confirm email",
          code: "email_confirmation_required",
        });
      }
      persistSession(sessionFromAuth(data.session, normalized));
      // #endif

      return true;
    } catch (error) {
      throw mapThrownError(error);
    } finally {
      isLoading.value = false;
    }
  }

  /** 邮箱 + 密码登录 */
  async function login(emailInput: string, password: string): Promise<boolean> {
    const normalized = emailInput.trim().toLowerCase();
    if (!isValidEmail(normalized)) {
      throw toAuthError({ message: "请输入有效的邮箱地址" });
    }
    if (!password) {
      throw toAuthError({ message: "请输入密码" });
    }

    isLoading.value = true;
    try {
      clearLocalAuthState();

      // #ifdef APP-PLUS
      const session = await signInWithEmail(normalized, password);
      if (!session.access_token || !session.user?.id) {
        throw toAuthError({ message: "登录成功但未获取到用户信息" });
      }
      persistSession(sessionFromAuth(session, normalized));
      // #endif

      // #ifdef H5
      const { supabase } = await import("@/api/supabase");
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      });
      if (error) throw toAuthError(error);
      if (!data.session || !data.user?.id) {
        throw toAuthError({ message: "登录成功但未获取到用户信息" });
      }
      persistSession(sessionFromAuth(data.session, normalized));
      // #endif

      return true;
    } catch (error) {
      throw mapThrownError(error);
    } finally {
      isLoading.value = false;
    }
  }

  async function logout(): Promise<void> {
    // #ifdef H5
    const { supabase } = await import("@/api/supabase");
    await supabase.auth.signOut();
    // #endif

    clearLocalAuthState();
  }

  return {
    email,
    phone,
    userId,
    profile,
    isLoading,
    sessionRestored,
    isLoggedIn,
    markSessionRestored,
    hydrateFromStorageSync,
    restoreSession,
    fetchProfile,
    register,
    login,
    logout,
  };
});
