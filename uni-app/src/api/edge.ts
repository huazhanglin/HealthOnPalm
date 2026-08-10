/**
 * Supabase Edge Function 调用封装（App / H5 共用）
 */
import { supabaseAnonKey, supabaseUrl } from "@/config/env";
import {
  handleAuthFailure,
  isAuthRequiredMessage,
  requireAccessToken,
} from "@/utils/auth-session";

const baseUrl = supabaseUrl;
const anonKey = supabaseAnonKey;

/** 获取当前会话 Access Token（自动续期） */
export async function getAccessToken(): Promise<string> {
  return requireAccessToken();
}

/** 调用 Supabase Edge Function */
export async function callEdgeFunction<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  if (!baseUrl || !anonKey) {
    throw new Error("缺少 Supabase 环境变量配置");
  }

  const token = await getAccessToken();

  const response = await uni.request({
    url: `${baseUrl}/functions/v1/${endpoint}`,
    method: "POST",
    header: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
    },
    data: JSON.stringify(body),
    dataType: "json",
  });

  const statusCode = response.statusCode ?? 0;
  let result = response.data as T & {
    error?: string;
    message?: string;
    code?: string;
  };

  if (typeof result === "string") {
    try {
      result = JSON.parse(result) as T & {
        error?: string;
        message?: string;
        code?: string;
      };
    } catch {
      throw new Error(result || `请求失败 (${statusCode})`);
    }
  }

  if (statusCode < 200 || statusCode >= 300) {
    if (statusCode === 401 || statusCode === 403) {
      handleAuthFailure("未登录，请先登录");
      throw new Error("未登录，请先登录");
    }
    if (statusCode === 404 || result.code === "NOT_FOUND") {
      throw new Error(
        `Edge Function「${endpoint}」未部署，请在 Supabase 执行 functions deploy`
      );
    }
    const rawMessage = result.error || result.message || `请求失败 (${statusCode})`;
    if (isAuthRequiredMessage(rawMessage)) {
      handleAuthFailure(rawMessage);
    }
    if (/忙碌|busy|rate limit|429|503/i.test(rawMessage)) {
      throw new Error("AI 服务繁忙，请稍后点击刷新重试");
    }
    throw new Error(rawMessage);
  }

  return result;
}
