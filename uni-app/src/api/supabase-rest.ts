/**
 * Supabase PostgREST 客户端（App 真机专用，绕过 supabase-js）
 */
import { supabaseAnonKey, supabaseUrl } from "@/config/env";
import { AUTH_STORAGE_KEY, type StoredAuthSession } from "@/types/auth";
import { handleAuthFailure } from "@/utils/auth-session";
import { getStorageJson } from "@/utils/storage";

function parseResponse<T>(response: UniApp.RequestSuccessCallbackResult): T {
  const status = response.statusCode ?? 0;
  let body = response.data as T | string;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body) as T;
    } catch {
      if (status < 200 || status >= 300) {
        throw new Error(body || `请求失败 (${status})`);
      }
    }
  }

  if (status < 200 || status >= 300) {
    const err = body as {
      error_description?: string;
      msg?: string;
      message?: string;
      error?: string;
      code?: string;
    };
    const message =
      err.error_description ||
      err.msg ||
      err.message ||
      err.error ||
      `请求失败 (${status})`;
    if (
      status === 401 ||
      status === 403 ||
      /jwt|unauthoriz|not authenticated/i.test(message)
    ) {
      handleAuthFailure("未登录，请先登录");
    }
    throw new Error(message);
  }

  return body as T;
}

function restHeaders(
  accessToken: string,
  extra: Record<string, string> = {}
): Record<string, string> {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...extra,
  };
}

/** 从本地会话读取 Access Token（不自动刷新；业务请用 ensureAccessToken） */
export function getStoredAccessToken(): string | null {
  const stored = getStorageJson<StoredAuthSession>(AUTH_STORAGE_KEY);
  if (!stored) return null;
  if (stored.expiresAt * 1000 <= Date.now()) return null;
  return stored.accessToken;
}

export {
  ensureAccessToken,
  ensureAppAuthContext,
  requireAccessToken,
} from "@/utils/auth-session";

export async function restSelect<T>(
  table: string,
  query: string,
  accessToken: string
): Promise<T> {
  const response = await uni.request({
    url: `${supabaseUrl}/rest/v1/${table}?${query}`,
    method: "GET",
    header: restHeaders(accessToken),
  });
  return parseResponse<T>(response);
}

export async function restSelectMaybeSingle<T>(
  table: string,
  query: string,
  accessToken: string
): Promise<T | null> {
  const rows = await restSelect<T[]>(table, query, accessToken);
  return rows[0] ?? null;
}

export async function restUpdate<T>(
  table: string,
  query: string,
  accessToken: string,
  payload: object
): Promise<T | null> {
  const response = await uni.request({
    url: `${supabaseUrl}/rest/v1/${table}?${query}`,
    method: "PATCH" as UniApp.RequestOptions["method"],
    header: restHeaders(accessToken, { Prefer: "return=representation" }),
    data: JSON.stringify(payload),
    dataType: "json",
  });
  const rows = parseResponse<T[]>(response);
  return rows[0] ?? null;
}

export async function restUpsert<T>(
  table: string,
  accessToken: string,
  payload: object
): Promise<T> {
  const response = await uni.request({
    url: `${supabaseUrl}/rest/v1/${table}`,
    method: "POST",
    header: restHeaders(accessToken, {
      Prefer: "resolution=merge-duplicates,return=representation",
    }),
    data: JSON.stringify(payload),
    dataType: "json",
  });
  const rows = parseResponse<T[]>(response);
  if (!rows[0]) {
    throw new Error("保存失败，未返回数据");
  }
  return rows[0];
}

export async function restInsert<T>(
  table: string,
  accessToken: string,
  payload: object
): Promise<T> {
  const response = await uni.request({
    url: `${supabaseUrl}/rest/v1/${table}`,
    method: "POST",
    header: restHeaders(accessToken, { Prefer: "return=representation" }),
    data: JSON.stringify(payload),
    dataType: "json",
  });
  const rows = parseResponse<T[]>(response);
  if (!rows[0]) {
    throw new Error("保存失败，未返回数据");
  }
  return rows[0];
}

export async function restDelete(
  table: string,
  query: string,
  accessToken: string
): Promise<void> {
  const response = await uni.request({
    url: `${supabaseUrl}/rest/v1/${table}?${query}`,
    method: "DELETE",
    header: restHeaders(accessToken),
    dataType: "json",
  });
  parseResponse(response);
}
