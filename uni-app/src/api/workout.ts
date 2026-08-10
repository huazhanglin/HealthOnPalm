// #ifdef H5
import { supabase } from "@/api/supabase";
// #endif
import {
  restDelete,
  restInsert,
  restSelect,
  restUpdate,
} from "@/api/supabase-rest";
import type { WorkoutLog } from "@/types/database";
import {
  type WorkoutLogForm,
  getWorkoutTypeLabel,
  validateWorkoutLogForm,
} from "@/lib/health/workout";
import { ensureAppAuthContext } from "@/utils/auth-session";

export interface WorkoutApiResult<T = null> {
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

/** 保存手动运动记录 */
export async function createWorkoutLog(
  form: WorkoutLogForm
): Promise<WorkoutApiResult<WorkoutLog>> {
  const validationError = validateWorkoutLogForm(form);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const payload = {
    date: form.date,
    workout_type: form.workoutType,
    workout_name: getWorkoutTypeLabel(form.workoutType),
    duration_minutes: Math.round(form.durationMinutes),
    perceived_exertion: Math.round(form.perceivedExertion),
    mood_after: "normal" as const,
    notes: form.notes.trim() || null,
    source: "user_logged" as const,
  };

  // #ifdef APP-PLUS
  const auth = await getAppAuthContext();
  if (!auth) {
    return { success: false, error: "未登录，请重新登录" };
  }
  try {
    const data = await restInsert<WorkoutLog>("workout_logs", auth.accessToken, {
      user_id: auth.userId,
      ...payload,
    });
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败，请稍后重试";
    console.error("[workoutApi] create failed:", message);
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
    .from("workout_logs")
    .insert({ user_id: user.id, ...payload })
    .select("*")
    .single();
  if (error || !data) {
    return { success: false, error: error?.message || "保存失败，请稍后重试" };
  }
  return { success: true, data };
  // #endif
}

/** 查询近 N 天运动记录（默认 7 天） */
export async function listWorkoutLogs(days = 7): Promise<WorkoutApiResult<WorkoutLog[]>> {
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
      `&order=date.desc,created_at.desc` +
      `&select=*`;
    const data = await restSelect<WorkoutLog[]>("workout_logs", query, auth.accessToken);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "加载失败";
    console.error("[workoutApi] list failed:", message);
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
    .from("workout_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data: data ?? [] };
  // #endif
}

/** 删除单条运动记录（软删优先，失败则硬删） */
export async function deleteWorkoutLog(id: string): Promise<WorkoutApiResult> {
  // #ifdef APP-PLUS
  const auth = await getAppAuthContext();
  if (!auth) {
    return { success: false, error: "未登录，请重新登录" };
  }
  try {
    const updated = await restUpdateSoftDelete(auth.accessToken, id, auth.userId);
    if (!updated) {
      await restDelete(
        "workout_logs",
        `id=eq.${id}&user_id=eq.${auth.userId}`,
        auth.accessToken
      );
    }
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除失败";
    console.error("[workoutApi] delete failed:", message);
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
    .from("workout_logs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (softError) {
    const { error } = await supabase
      .from("workout_logs")
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

async function restUpdateSoftDelete(
  accessToken: string,
  id: string,
  userId: string
): Promise<boolean> {
  try {
    const row = await restUpdate<WorkoutLog>(
      "workout_logs",
      `id=eq.${id}&user_id=eq.${userId}`,
      accessToken,
      { deleted_at: new Date().toISOString() }
    );
    return !!row;
  } catch {
    return false;
  }
}
