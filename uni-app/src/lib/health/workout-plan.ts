/**
 * 今日训练计划（workout-agent 返回结构）
 */

import {
  ensureAccessToken,
  restSelectMaybeSingle,
} from "@/api/supabase-rest";
import {
  parseWorkoutPlan,
  workoutPlanTodayYmd,
} from "@/lib/health/workout-plan-cache";
import {
  fetchExerciseMediaByIds,
  resolveExerciseDemoUrl,
} from "@/lib/health/exercises";

// #ifdef H5
import { supabase } from "@/api/supabase";
// #endif

export interface WorkoutPlanItem {
  id: string;
  tips: string;
  name_zh: string;
  name_en: string;
  category_zh: string;
  intensity: string;
  movement_phase: string;
  equipment_zh: string[];
  muscles_primary_zh: string[];
  image_url: string | null;
  attribution: string;
  description: string;
}

export interface WorkoutPlan {
  version: 1;
  title: string;
  reason: string;
  duration_minutes: number;
  estimated_calories: number;
  recovery_score: number;
  workout_readiness: "train" | "light" | "rest";
  warmup: WorkoutPlanItem[];
  main: WorkoutPlanItem[];
  cooldown: WorkoutPlanItem[];
  generated_by: "llm" | "template";
  generated_at: string;
  attribution_note: string;
}

function utcYmd(): string {
  return new Date().toISOString().split("T")[0];
}

async function fetchAiPlanByDate(
  userId: string,
  date: string
): Promise<WorkoutPlan | null> {
  // #ifdef APP-PLUS
  const accessToken = await ensureAccessToken();
  if (!accessToken) return null;
  const row = await restSelectMaybeSingle<{ ai_plan: string | null }>(
    "daily_summaries",
    `user_id=eq.${userId}&date=eq.${date}&select=ai_plan`,
    accessToken
  );
  return parseWorkoutPlan(row?.ai_plan);
  // #endif

  // #ifdef H5
  const { data, error } = await supabase
    .from("daily_summaries")
    .select("ai_plan")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  if (error) {
    console.warn("[workout-plan] 读取缓存计划失败:", error.message);
    return null;
  }
  return parseWorkoutPlan(data?.ai_plan);
  // #endif

  return null;
}

/** 直读今日 daily_summaries.ai_plan，避开 workout-agent 冷启动 */
export async function fetchTodayCachedWorkoutPlan(
  userId: string
): Promise<WorkoutPlan | null> {
  const localDate = workoutPlanTodayYmd();
  const localPlan = await fetchAiPlanByDate(userId, localDate);
  if (localPlan) return localPlan;
  const utcDate = utcYmd();
  if (utcDate === localDate) return null;
  return fetchAiPlanByDate(userId, utcDate);
}

function withResolvedImage(
  item: WorkoutPlanItem,
  media: { image_url: string | null; image_thumbnail_url: string | null } | undefined
): WorkoutPlanItem {
  const demo = resolveExerciseDemoUrl({
    image_url: media?.image_url ?? item.image_url,
    image_thumbnail_url: media?.image_thumbnail_url ?? null,
  });
  return { ...item, image_url: demo };
}

/** 用动作库补齐演示图，优先 gif */
export async function enrichWorkoutPlanMedia(
  plan: WorkoutPlan
): Promise<WorkoutPlan> {
  const ids = flattenPlanExerciseIds(plan);
  if (!ids.length) return plan;
  try {
    const media = await fetchExerciseMediaByIds(ids);
    return {
      ...plan,
      warmup: plan.warmup.map((item) => withResolvedImage(item, media.get(item.id))),
      main: plan.main.map((item) => withResolvedImage(item, media.get(item.id))),
      cooldown: plan.cooldown.map((item) =>
        withResolvedImage(item, media.get(item.id))
      ),
    };
  } catch (error) {
    console.warn("[workout-plan] 补齐动作图失败:", error);
    return plan;
  }
}

export function flattenPlanExerciseIds(plan: WorkoutPlan): string[] {
  return [...plan.warmup, ...plan.main, ...plan.cooldown].map((item) => item.id);
}

export function readinessLabel(
  readiness: WorkoutPlan["workout_readiness"] | null | undefined
): string {
  if (readiness === "train") return "适合训练";
  if (readiness === "light") return "轻度活动";
  if (readiness === "rest") return "以恢复为主";
  return "今日计划";
}

export function formatPlanItemTitle(item: Pick<WorkoutPlanItem, "name_zh" | "name_en">): string {
  if (!item.name_zh || item.name_zh === item.name_en) return item.name_en;
  return `${item.name_zh}（${item.name_en}）`;
}
