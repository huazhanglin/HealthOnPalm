// #ifdef H5
import { supabase } from "@/api/supabase";
// #endif
import {
  restDelete,
  restInsert,
  restSelect,
  restUpdate,
  restUpsert,
} from "@/api/supabase-rest";
import type { SleepLog } from "@/types/database";
import {
  type SleepLogForm,
  buildSleepTimestamps,
  calcSleepHours,
  starsToQualityScore,
  validateSleepLogForm,
} from "@/lib/health/sleep";
import { ensureAppAuthContext } from "@/utils/auth-session";

export interface SleepApiResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}

async function getAppAuthContext(): Promise<{
  userId: string;
  accessToken: string;
} | null> {
  return ensureAppAuthContext();
}

function buildPayload(form: SleepLogForm) {
  const hours = calcSleepHours(form.bedtime, form.wakeTime) ?? 0;
  const timestamps = buildSleepTimestamps(form.date, form.bedtime, form.wakeTime);
  return {
    date: form.date,
    total_sleep_hours: hours,
    wake_ups: Math.round(form.wakeUps),
    sleep_quality_score: starsToQualityScore(form.qualityStars),
    sleep_start_time: timestamps?.sleepStart ?? null,
    sleep_end_time: timestamps?.sleepEnd ?? null,
    source: "user_logged" as const,
  };
}

/** 保存手动睡眠记录（同日覆盖） */
export async function saveSleepLog(
  form: SleepLogForm
): Promise<SleepApiResult<SleepLog>> {
  const validationError = validateSleepLogForm(form);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const payload = buildPayload(form);

  // #ifdef APP-PLUS
  const auth = await getAppAuthContext();
  if (!auth) {
    return { success: false, error: "未登录，请重新登录" };
  }
  try {
    const existing = await restSelect<SleepLog[]>(
      "sleep_logs",
      `user_id=eq.${auth.userId}&date=eq.${form.date}&deleted_at=is.null&select=id,source&limit=1`,
      auth.accessToken
    );
    if (existing[0]?.source === "healthkit_sync") {
      return {
        success: false,
        error: "当日已有 HealthKit 睡眠数据，无需手动补充",
      };
    }
    if (existing[0]?.id) {
      const data = await restUpdate<SleepLog>(
        "sleep_logs",
        `id=eq.${existing[0].id}&user_id=eq.${auth.userId}`,
        auth.accessToken,
        payload
      );
      if (data) return { success: true, data };
    }

    try {
      const data = await restUpsert<SleepLog>("sleep_logs", auth.accessToken, {
        user_id: auth.userId,
        ...payload,
      });
      return { success: true, data };
    } catch {
      const data = await restInsert<SleepLog>("sleep_logs", auth.accessToken, {
        user_id: auth.userId,
        ...payload,
      });
      return { success: true, data };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败，请稍后重试";
    console.error("[sleepApi] save failed:", message);
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

  const { data: existing } = await supabase
    .from("sleep_logs")
    .select("id, source")
    .eq("user_id", user.id)
    .eq("date", form.date)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing?.source === "healthkit_sync") {
    return {
      success: false,
      error: "当日已有 HealthKit 睡眠数据，无需手动补充",
    };
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from("sleep_logs")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error || !data) {
      return { success: false, error: error?.message || "保存失败" };
    }
    return { success: true, data };
  }

  const { data, error } = await supabase
    .from("sleep_logs")
    .insert({ user_id: user.id, ...payload })
    .select("*")
    .single();
  if (error || !data) {
    return { success: false, error: error?.message || "保存失败" };
  }
  return { success: true, data };
  // #endif
}

/** 近 N 天睡眠记录 */
export async function listSleepLogs(days = 7): Promise<SleepApiResult<SleepLog[]>> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  // #ifdef APP-PLUS
  const auth = await getAppAuthContext();
  if (!auth) {
    return { success: false, error: "未登录，请重新登录" };
  }
  try {
    const query =
      `user_id=eq.${auth.userId}` +
      `&date=gte.${startDate}` +
      `&date=lte.${endDate}` +
      `&deleted_at=is.null` +
      `&order=date.desc` +
      `&select=*`;
    const data = await restSelect<SleepLog[]>("sleep_logs", query, auth.accessToken);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "加载失败";
    console.error("[sleepApi] list failed:", message);
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
    .from("sleep_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .is("deleted_at", null)
    .order("date", { ascending: false });
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data: data ?? [] };
  // #endif
}

/** 删除睡眠记录 */
export async function deleteSleepLog(id: string): Promise<SleepApiResult> {
  // #ifdef APP-PLUS
  const auth = await getAppAuthContext();
  if (!auth) {
    return { success: false, error: "未登录，请重新登录" };
  }
  try {
    const updated = await restUpdate<SleepLog>(
      "sleep_logs",
      `id=eq.${id}&user_id=eq.${auth.userId}`,
      auth.accessToken,
      { deleted_at: new Date().toISOString() }
    );
    if (!updated) {
      await restDelete(
        "sleep_logs",
        `id=eq.${id}&user_id=eq.${auth.userId}`,
        auth.accessToken
      );
    }
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除失败";
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
  const { error: softError } = await supabase
    .from("sleep_logs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (softError) {
    const { error } = await supabase
      .from("sleep_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { success: false, error: error.message };
  }
  return { success: true };
  // #endif
}
