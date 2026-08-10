// #ifdef H5
import { supabase } from "@/api/supabase";
// #endif
import { fetchUserRow } from "@/api/supabase-auth";
import { restUpdate, restUpsert } from "@/api/supabase-rest";
import type { User } from "@/types/database";
import type { ProfileUpdatePayload } from "@/types/profile";
import type { OnboardingCompletePayload } from "@/types/onboarding";
import { ensureAppAuthContext } from "@/utils/auth-session";

/** API 操作结果 */
export interface UserApiResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 获取当前登录用户的档案
 */
export async function getUserProfile(): Promise<User | null> {
  // #ifdef APP-PLUS
  const auth = await ensureAppAuthContext();
  if (!auth) return null;
  try {
    return await fetchUserRow<User>(auth.userId, auth.accessToken);
  } catch (error) {
    console.error("[userApi] 获取用户档案失败:", error);
    return null;
  }
  // #endif

  // #ifdef H5
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[userApi] 获取用户档案失败:", error.message);
    return null;
  }

  return data;
  // #endif
}

/**
 * 更新用户档案到 Supabase
 * 若记录不存在则尝试 upsert（兼容触发器未生效的情况）
 */
export async function updateUserProfile(
  payload: ProfileUpdatePayload
): Promise<UserApiResult<User>> {
  // #ifdef APP-PLUS
  const auth = await ensureAppAuthContext();
  if (!auth) {
    return { success: false, error: "未登录，请重新登录" };
  }

  try {
    const data = await restUpdate<User>(
      "users",
      `id=eq.${auth.userId}`,
      auth.accessToken,
      payload
    );
    if (data) {
      return { success: true, data };
    }

    const upsertData = await restUpsert<User>("users", auth.accessToken, {
      id: auth.userId,
      ...payload,
    });
    return { success: true, data: upsertData };
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败，请稍后重试";
    console.error("[userApi] 更新用户档案失败:", message);
    return { success: false, error: message };
  }
  // #endif

  // #ifdef H5
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "未登录，请重新登录" };
  }

  const { data, error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[userApi] 更新用户档案失败:", error.message);
    return { success: false, error: error.message || "保存失败，请稍后重试" };
  }

  if (data) {
    return { success: true, data };
  }

  const { data: upsertData, error: upsertError } = await supabase
    .from("users")
    .upsert({ id: user.id, ...payload })
    .select("*")
    .single();

  if (upsertError) {
    console.error("[userApi] 创建用户档案失败:", upsertError.message);
    return { success: false, error: upsertError.message || "保存失败，请稍后重试" };
  }

  return { success: true, data: upsertData };
  // #endif
}

/**
 * 检查是否需要新手引导
 */
export async function checkNeedsOnboarding(): Promise<boolean> {
  const profile = await getUserProfile();
  if (!profile) return true;
  return !profile.onboarding_completed;
}

/**
 * 完成新手引导：保存档案并标记 onboarding_completed = true
 */
export async function completeOnboarding(
  payload: OnboardingCompletePayload
): Promise<UserApiResult<User>> {
  // #ifdef APP-PLUS
  const auth = await ensureAppAuthContext();
  if (!auth) {
    return { success: false, error: "未登录，请重新登录" };
  }

  try {
    const data = await restUpdate<User>(
      "users",
      `id=eq.${auth.userId}`,
      auth.accessToken,
      payload
    );
    if (data) {
      return { success: true, data };
    }

    const upsertData = await restUpsert<User>("users", auth.accessToken, {
      id: auth.userId,
      ...payload,
    });
    return { success: true, data: upsertData };
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败，请稍后重试";
    console.error("[userApi] 完成新手引导失败:", message);
    return { success: false, error: message };
  }
  // #endif

  // #ifdef H5
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "未登录，请重新登录" };
  }

  const { data, error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[userApi] 完成新手引导失败:", error.message);
    return { success: false, error: error.message || "保存失败，请稍后重试" };
  }

  if (data) {
    return { success: true, data };
  }

  const { data: upsertData, error: upsertError } = await supabase
    .from("users")
    .upsert({ id: user.id, ...payload })
    .select("*")
    .single();

  if (upsertError) {
    console.error("[userApi] 创建并完成引导失败:", upsertError.message);
    return { success: false, error: upsertError.message || "保存失败，请稍后重试" };
  }

  return { success: true, data: upsertData };
  // #endif
}
