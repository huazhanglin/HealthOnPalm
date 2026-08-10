/**
 * 会话续期与登录跳转
 * - access token 临近/已过期时自动 refresh
 * - 无法续期时清会话并跳转登录页
 */
// #ifdef APP-PLUS
import { refreshAuthSession } from "@/api/supabase-auth";
// #endif
import { AUTH_STORAGE_KEY, type StoredAuthSession } from "@/types/auth";
import {
  getStorageJson,
  setStorageJson,
  uniAuthStorage,
} from "@/utils/storage";

/** 提前 5 分钟刷新，避免请求中途过期 */
const REFRESH_SKEW_MS = 5 * 60 * 1000;

let refreshInFlight: Promise<string | null> | null = null;
let redirectingToLogin = false;

export function isAuthRequiredMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  return /未登录|请先登录|请重新登录|jwt expired|invalid jwt|invalid claim|not authenticated|session.*expired/i.test(
    message
  );
}

export function readStoredAuthSession(): StoredAuthSession | null {
  const raw = getStorageJson<StoredAuthSession & { phone?: string }>(
    AUTH_STORAGE_KEY
  );
  if (!raw?.userId || !raw?.accessToken || !raw?.refreshToken) return null;
  return {
    userId: raw.userId,
    email: raw.email || raw.phone || "",
    phone: raw.phone,
    accessToken: raw.accessToken,
    refreshToken: raw.refreshToken,
    expiresAt: raw.expiresAt || 0,
  };
}

function writeStoredAuthSession(session: StoredAuthSession): void {
  setStorageJson(AUTH_STORAGE_KEY, session);
  syncPiniaSession(session);
}

function clearStoredAuthSession(): void {
  uniAuthStorage.removeItem(AUTH_STORAGE_KEY);
  syncPiniaSession(null);
}

function syncPiniaSession(session: StoredAuthSession | null): void {
  void import("@/stores/user")
    .then(({ useUserStore }) => {
      const store = useUserStore();
      if (session) {
        store.userId = session.userId;
        store.email = session.email || session.phone || null;
        store.phone = session.phone ?? null;
      } else {
        store.phone = null;
        store.email = null;
        store.userId = null;
        store.profile = null;
      }
    })
    .catch(() => {
      // Pinia 尚未就绪时忽略
    });
}

function isTokenFresh(expiresAtSec: number): boolean {
  return expiresAtSec * 1000 > Date.now() + REFRESH_SKEW_MS;
}

async function refreshStoredSession(
  stored: StoredAuthSession
): Promise<string | null> {
  if (!stored.refreshToken) {
    clearStoredAuthSession();
    return null;
  }

  try {
    // #ifdef APP-PLUS
    const refreshed = await refreshAuthSession(stored.refreshToken);
    if (!refreshed.access_token) {
      clearStoredAuthSession();
      return null;
    }
    const next: StoredAuthSession = {
      userId: refreshed.user?.id ?? stored.userId,
      email: refreshed.user?.email ?? (stored.email || stored.phone || ""),
      phone: refreshed.user?.phone ?? stored.phone,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || stored.refreshToken,
      expiresAt:
        refreshed.expires_at ??
        Math.floor(Date.now() / 1000) + (refreshed.expires_in || 3600),
    };
    writeStoredAuthSession(next);
    return next.accessToken;
    // #endif

    // #ifdef H5
    const { supabase } = await import("@/api/supabase");
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: stored.refreshToken,
    });
    if (error || !data.session?.access_token) {
      console.warn("[auth-session] H5 refresh failed:", error?.message);
      clearStoredAuthSession();
      return null;
    }
    const session = data.session;
    const next: StoredAuthSession = {
      userId: session.user?.id ?? stored.userId,
      email: session.user?.email ?? (stored.email || stored.phone || ""),
      phone: session.user?.phone ?? stored.phone,
      accessToken: session.access_token,
      refreshToken: session.refresh_token || stored.refreshToken,
      expiresAt:
        session.expires_at ??
        Math.floor(Date.now() / 1000) + (session.expires_in || 3600),
    };
    writeStoredAuthSession(next);
    return next.accessToken;
    // #endif
  } catch (error) {
    console.warn("[auth-session] refresh failed:", error);
    clearStoredAuthSession();
    return null;
  }
}

/**
 * 确保拿到可用 access token（必要时自动 refresh）
 */
export async function ensureAccessToken(): Promise<string | null> {
  const stored = readStoredAuthSession();
  if (!stored?.accessToken) return null;

  if (isTokenFresh(stored.expiresAt)) {
    return stored.accessToken;
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshStoredSession(stored).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * 拿到 token；失败则跳转登录并抛错
 */
export async function requireAccessToken(): Promise<string> {
  const token = await ensureAccessToken();
  if (!token) {
    redirectToLogin("登录已过期，请重新登录");
    throw new Error("未登录，请先登录");
  }
  return token;
}

/** App REST 调用用：userId + 已续期 token */
export async function ensureAppAuthContext(): Promise<{
  userId: string;
  accessToken: string;
} | null> {
  const accessToken = await ensureAccessToken();
  const stored = readStoredAuthSession();
  if (!accessToken || !stored?.userId) return null;
  return { userId: stored.userId, accessToken };
}

/**
 * 跳转登录页（清本地会话，避免停在原页只弹 Toast）
 */
export function redirectToLogin(toastMessage = "请先登录"): void {
  if (redirectingToLogin) return;

  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as { route?: string } | undefined;
  if (current?.route?.includes("pages/login/index")) {
    clearStoredAuthSession();
    return;
  }

  redirectingToLogin = true;
  clearStoredAuthSession();

  uni.showToast({
    title: toastMessage,
    icon: "none",
    duration: 2000,
  });

  setTimeout(() => {
    uni.reLaunch({
      url: "/pages/login/index",
      complete: () => {
        redirectingToLogin = false;
      },
      fail: () => {
        redirectingToLogin = false;
      },
    });
  }, 350);
}

/** 若错误信息表示未登录，则跳转登录；返回是否已处理 */
export function handleAuthFailure(error: unknown): boolean {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";
  if (!isAuthRequiredMessage(message)) return false;
  redirectToLogin(
    /过期|expired/i.test(message) ? "登录已过期，请重新登录" : "请先登录"
  );
  return true;
}
