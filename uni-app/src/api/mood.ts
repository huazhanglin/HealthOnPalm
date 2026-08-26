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
import type { MoodLog } from "@/types/database";
import {
  type MoodLogForm,
  validateMoodLogForm,
} from "@/lib/health/mood";
import { ensureAppAuthContext } from "@/utils/auth-session";

export interface MoodApiResult<T = null> {
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

function buildPayload(form: MoodLogForm) {
  return {
    date: form.date,
    mood: form.mood,
    note: form.note.trim() || null,
    source: "user_logged" as const,
  };
}

/** 保存心情（同日覆盖） */
export async function saveMoodLog(
  form: MoodLogForm
): Promise<MoodApiResult<MoodLog>> {
  const validationError = validateMoodLogForm(form);
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
    const existing = await restSelect<MoodLog[]>(
      "mood_logs",
      `user_id=eq.${auth.userId}&date=eq.${form.date}&deleted_at=is.null&select=id&limit=1`,
      auth.accessToken
    );
    if (existing[0]?.id) {
      const data = await restUpdate<MoodLog>(
        "mood_logs",
        `id=eq.${existing[0].id}&user_id=eq.${auth.userId}`,
        auth.accessToken,
        payload
      );
      if (data) return { success: true, data };
    }

    try {
      const data = await restUpsert<MoodLog>("mood_logs", auth.accessToken, {
        user_id: auth.userId,
        ...payload,
      });
      return { success: true, data };
    } catch {
      const data = await restInsert<MoodLog>("mood_logs", auth.accessToken, {
        user_id: auth.userId,
        ...payload,
      });
      return { success: true, data };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败，请稍后重试";
    console.error("[moodApi] save failed:", message);
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
    .from("mood_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", form.date)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("mood_logs")
      .update(payload)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error || !data) {
      return { success: false, error: error?.message || "保存失败" };
    }
    return { success: true, data };
  }

  const { data, error } = await supabase
    .from("mood_logs")
    .upsert({ user_id: user.id, ...payload }, { onConflict: "user_id,date" })
    .select("*")
    .single();
  if (error || !data) {
    return { success: false, error: error?.message || "保存失败" };
  }
  return { success: true, data };
  // #endif
}

/** 近 N 天心情 */
export async function listMoodLogs(days = 7): Promise<MoodApiResult<MoodLog[]>> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
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
    const data = await restSelect<MoodLog[]>("mood_logs", query, auth.accessToken);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "加载失败";
    console.error("[moodApi] list failed:", message);
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
    .from("mood_logs")
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

/** 删除心情记录（软删优先） */
export async function deleteMoodLog(id: string): Promise<MoodApiResult> {
  // #ifdef APP-PLUS
  const auth = await getAppAuthContext();
  if (!auth) {
    return { success: false, error: "未登录，请重新登录" };
  }
  try {
    try {
      await restUpdate(
        "mood_logs",
        `id=eq.${id}&user_id=eq.${auth.userId}`,
        auth.accessToken,
        { deleted_at: new Date().toISOString() }
      );
      return { success: true };
    } catch {
      await restDelete(
        "mood_logs",
        `id=eq.${id}&user_id=eq.${auth.userId}`,
        auth.accessToken
      );
      return { success: true };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除失败";
    console.error("[moodApi] delete failed:", message);
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
    .from("mood_logs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (softError) {
    const { error } = await supabase
      .from("mood_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: true };
  // #endif
}
