import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { supabase } from "@/api/supabase";
import {
  AUTH_STORAGE_KEY,
  type AuthErrorInfo,
  type StoredAuthSession,
} from "@/types/auth";

/** 将 Supabase 错误转换为用户可读中文提示 */
function toAuthError(error: { message: string; code?: string }): AuthErrorInfo {
  const code = error.code;

  if (code === "otp_expired") {
    return { message: "验证码已过期，请重新发送", code };
  }
  if (code === "invalid_otp") {
    return { message: "验证码不正确，请检查后重试", code };
  }
  if (code === "over_sms_send_rate_limit") {
    return { message: "发送过于频繁，请稍后再试", code };
  }

  return { message: error.message || "操作失败，请稍后重试", code };
}

/** 组合 E.164 国际手机号 */
export function buildE164Phone(dialCode: string, phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, "");
  const normalizedCode = dialCode.startsWith("+") ? dialCode : `+${dialCode}`;
  return `${normalizedCode}${digits}`;
}

/** 校验本地手机号格式（不含区号） */
export function isValidLocalPhone(phoneNumber: string): boolean {
  const digits = phoneNumber.replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 15;
}

/**
 * 用户认证 Store
 * 封装 Supabase Phone OTP 登录，并同步会话到 localStorage
 */
export const useUserStore = defineStore("user", () => {
  const phone = ref<string | null>(null);
  const isLoading = ref(false);
  const lastError = ref<AuthErrorInfo | null>(null);
  const isLoggedIn = computed(() => !!phone.value);

  /** 从 localStorage 恢复会话摘要 */
  function restoreSession(): void {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;

    try {
      const stored = JSON.parse(raw) as StoredAuthSession;
      if (stored.expiresAt * 1000 > Date.now()) {
        phone.value = stored.phone;
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  /** 将 Supabase Session 写入 localStorage */
  function persistSession(
    userId: string,
    userPhone: string,
    accessToken: string,
    refreshToken: string,
    expiresAt: number
  ): void {
    const payload: StoredAuthSession = {
      userId,
      phone: userPhone,
      accessToken,
      refreshToken,
      expiresAt,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
    phone.value = userPhone;
  }

  /** 发送短信验证码 */
  async function sendOtp(dialCode: string, phoneNumber: string): Promise<boolean> {
    lastError.value = null;

    if (!isValidLocalPhone(phoneNumber)) {
      lastError.value = { message: "请输入有效的手机号" };
      return false;
    }

    const fullPhone = buildE164Phone(dialCode, phoneNumber);
    isLoading.value = true;

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: { channel: "sms" },
      });

      if (error) {
        lastError.value = toAuthError(error);
        return false;
      }

      return true;
    } catch (err) {
      lastError.value = {
        message: err instanceof Error ? err.message : "发送验证码失败",
      };
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /** 验证 OTP 并登录 */
  async function verifyOtp(
    dialCode: string,
    phoneNumber: string,
    token: string
  ): Promise<boolean> {
    lastError.value = null;

    const trimmedOtp = token.replace(/\D/g, "");
    if (trimmedOtp.length < 4) {
      lastError.value = { message: "请输入完整验证码" };
      return false;
    }

    const fullPhone = buildE164Phone(dialCode, phoneNumber);
    isLoading.value = true;

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: trimmedOtp,
        type: "sms",
      });

      if (error) {
        lastError.value = toAuthError(error);
        return false;
      }

      const session = data.session;
      const user = data.user;

      if (!session || !user?.phone) {
        lastError.value = { message: "登录成功但未获取到用户信息" };
        return false;
      }

      persistSession(
        user.id,
        user.phone,
        session.access_token,
        session.refresh_token,
        session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in
      );

      return true;
    } catch (err) {
      lastError.value = {
        message: err instanceof Error ? err.message : "登录失败，请重试",
      };
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /** 登出并清除本地会话 */
  async function logout(): Promise<void> {
    await supabase.auth.signOut();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    phone.value = null;
    lastError.value = null;
  }

  /** 清除最近一次错误 */
  function clearError(): void {
    lastError.value = null;
  }

  return {
    phone,
    isLoading,
    lastError,
    isLoggedIn,
    restoreSession,
    sendOtp,
    verifyOtp,
    logout,
    clearError,
  };
});
