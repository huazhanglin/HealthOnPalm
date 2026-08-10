/**
 * Supabase Auth REST 客户端（iOS App 真机专用，绕过 createClient 的 URL 校验问题）
 */
import { logSupabaseConfig, supabaseAnonKey, supabaseUrl } from "@/config/env";

let configLogged = false;

function ensureConfigLogged(): void {
  if (configLogged) return;
  configLogged = true;
  logSupabaseConfig();
}

export interface SupabaseAuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: {
    id: string;
    email?: string;
    phone?: string;
  };
}

/** Auth REST 请求错误（保留 Supabase 原始 error / error_code） */
export class AuthRequestError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(message: string, code?: string, status = 0) {
    super(message);
    this.name = "AuthRequestError";
    this.code = code;
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  };
}

function extractAuthError(body: unknown, status: number): AuthRequestError {
  const err = (body ?? {}) as {
    error_description?: string;
    msg?: string;
    message?: string;
    error?: string;
    error_code?: string;
    code?: string | number;
  };

  const code =
    err.error_code ||
    (typeof err.code === "string" ? err.code : undefined) ||
    err.error;

  const message =
    err.error_description ||
    err.msg ||
    err.message ||
    err.error ||
    `请求失败 (${status})`;

  return new AuthRequestError(message, code, status);
}

function parseResponse<T>(response: UniApp.RequestSuccessCallbackResult): T {
  const status = response.statusCode ?? 0;
  let body = response.data as T | string;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body) as T;
    } catch {
      if (status < 200 || status >= 300) {
        const message =
          typeof body === "string" ? body : `请求失败 (${status})`;
        throw new AuthRequestError(message, undefined, status);
      }
    }
  }

  if (status < 200 || status >= 300) {
    throw extractAuthError(body, status);
  }

  return body as T;
}

async function authRequest<T>(
  path: string,
  payload: Record<string, unknown>
): Promise<T> {
  const response = await uni.request({
    url: `${supabaseUrl}${path}`,
    method: "POST",
    header: authHeaders(),
    data: JSON.stringify(payload),
    dataType: "json",
  });

  return parseResponse<T>(response);
}

/**
 * 邮箱注册
 * 若项目开启了 Confirm email，可能没有 session，需提示用户确认或关闭确认。
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<SupabaseAuthSession> {
  ensureConfigLogged();
  const data = await authRequest<{
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    expires_at?: number;
    token_type?: string;
    user?: SupabaseAuthSession["user"];
    session?: SupabaseAuthSession | null;
  }>("/auth/v1/signup", {
    email,
    password,
  });

  // 部分版本把 session 嵌套返回
  if (data.session?.access_token) {
    return data.session;
  }

  if (data.access_token && data.refresh_token && data.user?.id) {
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in ?? 3600,
      expires_at: data.expires_at,
      token_type: data.token_type ?? "bearer",
      user: data.user,
    };
  }

  throw new AuthRequestError(
    "注册成功，但需要邮箱确认后才能登录。内测请在 Supabase Authentication → Providers → Email 关闭 Confirm email",
    "email_confirmation_required",
    200
  );
}

/** 邮箱 + 密码登录 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<SupabaseAuthSession> {
  ensureConfigLogged();
  return authRequest<SupabaseAuthSession>(
    "/auth/v1/token?grant_type=password",
    {
      email,
      password,
      grant_type: "password",
    }
  );
}

/** 使用 refresh_token 刷新会话 */
export async function refreshAuthSession(
  refreshToken: string
): Promise<SupabaseAuthSession> {
  return authRequest<SupabaseAuthSession>(
    "/auth/v1/token?grant_type=refresh_token",
    {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }
  );
}

/** 使用 Access Token 查询 users 表 */
export async function fetchUserRow<T>(
  userId: string,
  accessToken: string
): Promise<T | null> {
  const response = await uni.request({
    url: `${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=*`,
    method: "GET",
    header: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    dataType: "json",
  });

  const rows = parseResponse<T[]>(response);
  return rows[0] ?? null;
}
