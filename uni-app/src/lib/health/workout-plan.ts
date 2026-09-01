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
  /** 组数（1–6） */
  sets?: number | null;
  /** 次数或区间，如 "10" / "10-12"；与 duration_seconds 择一为主 */
  reps?: string | null;
  /** 按时长完成的动作（平板、拉伸等），秒 */
  duration_seconds?: number | null;
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

type DosePhase = "warmup" | "main" | "cooldown";

function utcYmd(): string {
  return new Date().toISOString().split("T")[0];
}

function looksTimedExercise(item: Pick<WorkoutPlanItem, "name_zh" | "name_en" | "category_zh">): boolean {
  const text = `${item.name_zh} ${item.name_en} ${item.category_zh}`.toLowerCase();
  return /plank|hold|stretch|isometric|平板|支撑|拉伸|静蹲|wall sit|鸟狗|dead bug/.test(
    text
  );
}

function hasExerciseDose(item: WorkoutPlanItem): boolean {
  const sets = Number(item.sets);
  const hasSets = Number.isFinite(sets) && sets >= 1;
  const hasReps = typeof item.reps === "string" && item.reps.trim().length > 0;
  const duration = Number(item.duration_seconds);
  const hasDuration = Number.isFinite(duration) && duration >= 5;
  return (hasSets && hasReps) || hasDuration;
}

/** 缺剂量时按阶段与恢复档补保守默认值（不写重量） */
export function defaultExerciseDose(
  phase: DosePhase,
  item: Pick<WorkoutPlanItem, "name_zh" | "name_en" | "category_zh" | "intensity">,
  readiness: WorkoutPlan["workout_readiness"]
): Pick<WorkoutPlanItem, "sets" | "reps" | "duration_seconds"> {
  const timed = looksTimedExercise(item);

  if (phase === "warmup") {
    if (timed) return { sets: 1, reps: null, duration_seconds: 30 };
    return { sets: 1, reps: "8-10", duration_seconds: null };
  }

  if (phase === "cooldown") {
    return { sets: 1, reps: null, duration_seconds: 30 };
  }

  if (timed) {
    if (readiness === "rest") return { sets: 2, reps: null, duration_seconds: 20 };
    if (readiness === "light") return { sets: 2, reps: null, duration_seconds: 25 };
    return { sets: 3, reps: null, duration_seconds: 30 };
  }

  if (readiness === "rest") return { sets: 2, reps: "8-10", duration_seconds: null };
  if (readiness === "light") return { sets: 2, reps: "10-12", duration_seconds: null };
  if (item.intensity === "high") return { sets: 3, reps: "6-10", duration_seconds: null };
  return { sets: 3, reps: "8-12", duration_seconds: null };
}

export function ensureWorkoutPlanDoses(plan: WorkoutPlan): WorkoutPlan {
  const readiness = plan.workout_readiness;
  const fix = (item: WorkoutPlanItem, phase: DosePhase): WorkoutPlanItem => {
    if (hasExerciseDose(item)) {
      return {
        ...item,
        sets: item.sets != null ? Math.min(6, Math.max(1, Math.round(Number(item.sets)))) : item.sets,
        reps: item.reps?.trim() || null,
        duration_seconds:
          item.duration_seconds != null
            ? Math.min(180, Math.max(5, Math.round(Number(item.duration_seconds))))
            : null,
      };
    }
    return { ...item, ...defaultExerciseDose(phase, item, readiness) };
  };

  return {
    ...plan,
    warmup: plan.warmup.map((item) => fix(item, "warmup")),
    main: plan.main.map((item) => fix(item, "main")),
    cooldown: plan.cooldown.map((item) => fix(item, "cooldown")),
  };
}

/** 展示用剂量文案，如「3 组 × 10–12 次」 */
export function formatExerciseDose(
  item: Pick<WorkoutPlanItem, "sets" | "reps" | "duration_seconds">
): string {
  const sets = Number(item.sets);
  const duration = Number(item.duration_seconds);
  const reps = typeof item.reps === "string" ? item.reps.trim() : "";

  if (Number.isFinite(duration) && duration >= 5) {
    if (Number.isFinite(sets) && sets >= 1) {
      return `${Math.round(sets)} 组 × 每组 ${Math.round(duration)} 秒`;
    }
    return `保持 ${Math.round(duration)} 秒`;
  }

  if (Number.isFinite(sets) && sets >= 1 && reps) {
    return `${Math.round(sets)} 组 × ${reps.replace(/-/g, "–")} 次`;
  }

  return "";
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
  const plan = parseWorkoutPlan(row?.ai_plan);
  return plan ? ensureWorkoutPlanDoses(plan) : null;
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
  const plan = parseWorkoutPlan(data?.ai_plan);
  return plan ? ensureWorkoutPlanDoses(plan) : null;
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
  media?: { image_url: string | null; image_thumbnail_url: string | null }
): WorkoutPlanItem {
  const demo = resolveExerciseDemoUrl({
    image_url: media?.image_url ?? item.image_url,
    image_thumbnail_url: media?.image_thumbnail_url ?? null,
    name_en: item.name_en,
    name_zh: item.name_zh,
  });
  return { ...item, image_url: demo };
}

/** 无网也可套上本地示意图（如侧平板） */
export function applyLocalExerciseDemos(plan: WorkoutPlan): WorkoutPlan {
  return {
    ...plan,
    warmup: plan.warmup.map((item) => withResolvedImage(item)),
    main: plan.main.map((item) => withResolvedImage(item)),
    cooldown: plan.cooldown.map((item) => withResolvedImage(item)),
  };
}

/** 用动作库补齐演示图，优先 gif */
export async function enrichWorkoutPlanMedia(
  plan: WorkoutPlan
): Promise<WorkoutPlan> {
  const withDose = ensureWorkoutPlanDoses(plan);
  const ids = flattenPlanExerciseIds(withDose);
  if (!ids.length) return applyLocalExerciseDemos(withDose);
  try {
    const media = await fetchExerciseMediaByIds(ids);
    return {
      ...withDose,
      warmup: withDose.warmup.map((item) =>
        withResolvedImage(item, media.get(item.id))
      ),
      main: withDose.main.map((item) => withResolvedImage(item, media.get(item.id))),
      cooldown: withDose.cooldown.map((item) =>
        withResolvedImage(item, media.get(item.id))
      ),
    };
  } catch (error) {
    console.warn("[workout-plan] 补齐动作图失败:", error);
    return applyLocalExerciseDemos(withDose);
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

/** 无图占位：动作名缩写，避免只显示「热身」「正式」 */
export function formatExerciseThumbLabel(
  item: Pick<WorkoutPlanItem, "name_zh" | "name_en">
): string {
  const zh = (item.name_zh || "").trim();
  if (/^[\u4e00-\u9fff]/.test(zh)) return zh.slice(0, 2) || "练";
  const en = (item.name_en || zh).trim();
  const words = en.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
  }
  return (en.slice(0, 2) || "练").toUpperCase();
}
