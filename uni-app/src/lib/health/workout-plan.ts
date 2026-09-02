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
type DoseFields = Pick<WorkoutPlanItem, "sets" | "reps" | "duration_seconds">;
type DoseItem = Pick<WorkoutPlanItem, "name_zh" | "name_en" | "category_zh" | "intensity">;

function utcYmd(): string {
  return new Date().toISOString().split("T")[0];
}

function exerciseText(item: Pick<WorkoutPlanItem, "name_zh" | "name_en" | "category_zh">): string {
  return `${item.name_zh} ${item.name_en} ${item.category_zh}`.toLowerCase();
}

/** 动态平板变式（肩触、开合等）按次数，不按时长 */
function isDynamicPlankVariant(item: Pick<WorkoutPlanItem, "name_en">): boolean {
  const en = (item.name_en || "").toLowerCase();
  if (!/plank/.test(en)) return false;
  return /tap|jack|reach|row|lift|extension|alternating|to /.test(en);
}

/** 静态维持：标准/侧平板、静蹲、拉伸。鸟狗、死虫、俯卧撑等走次数 */
function looksTimedExercise(item: Pick<WorkoutPlanItem, "name_zh" | "name_en" | "category_zh">): boolean {
  const text = exerciseText(item);
  if (/stretch|拉伸|伸展/.test(text)) return true;
  if (/wall sit|静蹲|靠墙坐/.test(text)) return true;
  if (isDynamicPlankVariant(item)) return false;
  return /(?:^|[\s(])plank|side plank|forearm plank|front plank|reverse plank|平板/.test(text);
}

function isHoldExercise(item: Pick<WorkoutPlanItem, "name_zh" | "name_en" | "category_zh">): boolean {
  const text = exerciseText(item);
  return /plank|平板|wall sit|静蹲|靠墙坐/.test(text) && !isDynamicPlankVariant(item);
}

function clampSets(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(6, Math.max(1, Math.round(n)));
}

function parseReps(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/[–—]/g, "-").replace(/次/g, "").trim();
  if (!s) return null;
  if (/^\d{1,2}(-\d{1,2})?$/.test(s)) return s;
  return null;
}

function clampTimedDuration(raw: unknown, minSeconds: number): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < minSeconds) return null;
  return Math.min(180, Math.round(n));
}

function minTimedSeconds(item: DoseItem, phase: DosePhase): number {
  if (phase === "cooldown") return 20;
  if (isHoldExercise(item)) return 30;
  return 20;
}

/** 缺剂量时按阶段与恢复档补保守默认值（不写重量） */
export function defaultExerciseDose(
  phase: DosePhase,
  item: DoseItem,
  readiness: WorkoutPlan["workout_readiness"]
): DoseFields {
  const timed = phase === "cooldown" || looksTimedExercise(item);

  if (phase === "warmup") {
    if (timed) {
      return { sets: 1, reps: null, duration_seconds: isHoldExercise(item) ? 30 : 20 };
    }
    return { sets: 1, reps: "8-10", duration_seconds: null };
  }

  if (phase === "cooldown") {
    return { sets: 1, reps: null, duration_seconds: 30 };
  }

  if (timed) {
    const sets = readiness === "train" ? 3 : 2;
    return { sets, reps: null, duration_seconds: 30 };
  }

  if (readiness === "rest") return { sets: 2, reps: "8-10", duration_seconds: null };
  if (readiness === "light") return { sets: 2, reps: "10-12", duration_seconds: null };
  if (item.intensity === "high") return { sets: 3, reps: "6-10", duration_seconds: null };
  return { sets: 3, reps: "8-12", duration_seconds: null };
}

function normalizeExerciseDose(
  item: WorkoutPlanItem,
  phase: DosePhase,
  readiness: WorkoutPlan["workout_readiness"]
): WorkoutPlanItem {
  const defaults = defaultExerciseDose(phase, item, readiness);
  const timed = phase === "cooldown" || looksTimedExercise(item);

  if (timed) {
    return {
      ...item,
      sets: clampSets(item.sets) ?? defaults.sets,
      reps: null,
      duration_seconds:
        clampTimedDuration(item.duration_seconds, minTimedSeconds(item, phase)) ??
        defaults.duration_seconds,
    };
  }

  return {
    ...item,
    sets: clampSets(item.sets) ?? defaults.sets,
    reps: parseReps(item.reps) ?? defaults.reps,
    duration_seconds: null,
  };
}

export function ensureWorkoutPlanDoses(plan: WorkoutPlan): WorkoutPlan {
  const readiness = plan.workout_readiness;
  return {
    ...plan,
    warmup: plan.warmup.map((item) => normalizeExerciseDose(item, "warmup", readiness)),
    main: plan.main.map((item) => normalizeExerciseDose(item, "main", readiness)),
    cooldown: plan.cooldown.map((item) => normalizeExerciseDose(item, "cooldown", readiness)),
  };
}

/** 展示用剂量文案，如「3 组 × 10–12 次」或「3 组 × 每组 30 秒」 */
export function formatExerciseDose(item: DoseFields): string {
  const sets = Number(item.sets);
  const duration = Number(item.duration_seconds);
  const reps = typeof item.reps === "string" ? item.reps.trim() : "";

  if (Number.isFinite(sets) && sets >= 1 && reps) {
    return `${Math.round(sets)} 组 × ${reps.replace(/-/g, "–")} 次`;
  }

  if (Number.isFinite(duration) && duration >= 20) {
    if (Number.isFinite(sets) && sets >= 1) {
      return `${Math.round(sets)} 组 × 每组 ${Math.round(duration)} 秒`;
    }
    return `保持 ${Math.round(duration)} 秒`;
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
