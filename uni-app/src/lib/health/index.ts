// #ifdef H5
import { supabase } from "@/api/supabase";
// #endif
import {
  restSelect,
  restSelectMaybeSingle,
} from "@/api/supabase-rest";
import type {
  BriefFeedback,
  DailySummaryBrief,
  HomePageData,
  MetricsDataSource,
  MorningBriefData,
  TodayHealthMetrics,
  WorkoutReadiness,
} from "@/lib/health/types";
import {
  assessClientDataQuality,
  formatMetricsSourceLabel,
  resolveMetricsSource,
} from "@/lib/health/data-quality";
import { createEmptyTodayHealthMetrics } from "@/lib/health/metrics-display";
import { ensureAccessToken } from "@/utils/auth-session";

/** 获取本地时区的今日日期字符串 YYYY-MM-DD */
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 剥离历史缓存中可能仍带的固定免责声明 */
export function stripBriefDisclaimer(text: string): string {
  return text
    .replace(
      /\n*\s*(⚠️\s*)?以上为非医疗建议[，,]?如有不适请咨询(医生|专业医生|医生或专业教练)。?\s*$/u,
      ""
    )
    .trimEnd();
}

function buildActivityMinutes(
  summary: { stand_hours?: number | null; exercise_minutes?: number | null } | null,
  workouts: { duration_minutes?: number | null }[]
): number | null {
  if (summary?.exercise_minutes != null && summary.exercise_minutes > 0) {
    return summary.exercise_minutes;
  }
  if (workouts.length > 0) {
    return workouts.reduce((sum, item) => sum + (item.duration_minutes ?? 0), 0);
  }
  if (summary?.stand_hours != null) {
    return Math.round(summary.stand_hours * 60);
  }
  return null;
}

interface TodaySnapshotRow {
  steps: number | null;
  stand_hours: number | null;
  active_calories: number | null;
  basal_calories: number | null;
  exercise_minutes: number | null;
  resting_heart_rate: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  walking_hr_avg: number | null;
  hrv_ms: number | null;
  spo2_percent: number | null;
  respiratory_rate: number | null;
  flights_climbed: number | null;
  vo2_max: number | null;
  total_workouts: number | null;
  total_distance_meters: number | null;
  source: string | null;
}

interface TodaySleepRow {
  total_sleep_hours: number | null;
  deep_sleep_hours: number | null;
  rem_sleep_hours: number | null;
  light_sleep_hours: number | null;
  wake_ups: number | null;
  source: string | null;
}

const SUMMARY_SELECT =
  "steps,stand_hours,active_calories,basal_calories,exercise_minutes,resting_heart_rate,avg_heart_rate,max_heart_rate,walking_hr_avg,hrv_ms,spo2_percent,respiratory_rate,flights_climbed,vo2_max,total_workouts,total_distance_meters,source";

const SLEEP_SELECT =
  "total_sleep_hours,deep_sleep_hours,rem_sleep_hours,light_sleep_hours,wake_ups,source";

function mapTodayMetrics(
  summary: TodaySnapshotRow | null | undefined,
  sleep: TodaySleepRow | null | undefined,
  workouts: { duration_minutes?: number | null }[]
): TodayHealthMetrics {
  const total = sleep?.total_sleep_hours ?? null;
  const deep = sleep?.deep_sleep_hours ?? null;
  const rem = sleep?.rem_sleep_hours ?? null;
  let light = sleep?.light_sleep_hours ?? null;
  if (
    light == null &&
    total != null &&
    deep != null &&
    rem != null &&
    total > 0
  ) {
    light = Math.max(0, Math.round((total - deep - rem) * 10) / 10);
  }

  return {
    steps: summary?.steps ?? null,
    sleepHours: total,
    deepSleepHours: deep,
    remSleepHours: rem,
    lightSleepHours: light,
    wakeUps: sleep?.wake_ups ?? null,
    activeCalories: summary?.active_calories ?? null,
    basalCalories: summary?.basal_calories ?? null,
    standHours: summary?.stand_hours ?? null,
    exerciseMinutes: summary?.exercise_minutes ?? null,
    activityMinutes: buildActivityMinutes(summary ?? null, workouts),
    restingHeartRate: summary?.resting_heart_rate ?? null,
    avgHeartRate: summary?.avg_heart_rate ?? null,
    maxHeartRate: summary?.max_heart_rate ?? null,
    walkingHeartRateAvg: summary?.walking_hr_avg ?? null,
    hrvMs: summary?.hrv_ms ?? null,
    spo2Percent: summary?.spo2_percent ?? null,
    respiratoryRate: summary?.respiratory_rate ?? null,
    flightsClimbed: summary?.flights_climbed ?? null,
    vo2Max: summary?.vo2_max ?? null,
    totalWorkouts: summary?.total_workouts ?? null,
    totalDistanceMeters: summary?.total_distance_meters ?? null,
  };
}

/**
 * T9：获取今日健康指标 + 数据源/质量（自动识别 HealthKit / 混合 / Mock）
 */
export async function getTodayHealthSnapshot(
  userId: string
): Promise<HomePageData> {
  const today = getTodayDateString();
  const empty: HomePageData = {
    metrics: createEmptyTodayHealthMetrics(),
    metricsSource: "unknown",
    qualityScore: 0,
  };

  // #ifdef APP-PLUS
  const accessToken = await ensureAccessToken();
  if (!accessToken) return empty;

  try {
    const [summary, sleep, workouts, syncLogs] = await Promise.all([
      restSelectMaybeSingle<TodaySnapshotRow>(
        "daily_summaries",
        `user_id=eq.${userId}&date=eq.${today}&select=${SUMMARY_SELECT}`,
        accessToken
      ),
      restSelectMaybeSingle<TodaySleepRow>(
        "sleep_logs",
        `user_id=eq.${userId}&date=eq.${today}&select=${SLEEP_SELECT}`,
        accessToken
      ),
      restSelect<{ duration_minutes: number | null }>(
        "workout_logs",
        `user_id=eq.${userId}&date=eq.${today}&select=duration_minutes`,
        accessToken
      ),
      restSelect<{ id: string }>(
        "sync_logs",
        `user_id=eq.${userId}&sync_date=eq.${today}&status=eq.success&select=id&limit=1`,
        accessToken
      ),
    ]);

    const metrics = mapTodayMetrics(summary, sleep, workouts ?? []);

    const quality = assessClientDataQuality({
      steps: summary?.steps,
      sleepHours: sleep?.total_sleep_hours,
      activeCalories: summary?.active_calories,
      standHours: summary?.stand_hours,
      summarySource: summary?.source,
      sleepSource: sleep?.source,
      hasSuccessfulSync: (syncLogs?.length ?? 0) > 0,
    });

    return {
      metrics,
      metricsSource: resolveMetricsSource(quality, summary?.source),
      qualityScore: quality.quality_score,
    };
  } catch (error) {
    console.error("[health] 查询今日快照失败:", error);
    return empty;
  }
  // #endif

  // #ifdef H5
  const [summaryResult, sleepResult, workoutResult, syncResult] =
    await Promise.all([
      supabase
        .from("daily_summaries")
        .select(SUMMARY_SELECT)
        .eq("user_id", userId)
        .eq("date", today)
        .maybeSingle(),
      supabase
        .from("sleep_logs")
        .select(SLEEP_SELECT)
        .eq("user_id", userId)
        .eq("date", today)
        .maybeSingle(),
      supabase
        .from("workout_logs")
        .select("duration_minutes")
        .eq("user_id", userId)
        .eq("date", today),
      supabase
        .from("sync_logs")
        .select("id")
        .eq("user_id", userId)
        .eq("sync_date", today)
        .eq("status", "success")
        .limit(1),
    ]);

  const summary = summaryResult.data as TodaySnapshotRow | null;
  const sleep = sleepResult.data as TodaySleepRow | null;
  const metrics = mapTodayMetrics(summary, sleep, workoutResult.data ?? []);

  const quality = assessClientDataQuality({
    steps: summary?.steps,
    sleepHours: sleep?.total_sleep_hours,
    activeCalories: summary?.active_calories,
    standHours: summary?.stand_hours,
    summarySource: summary?.source,
    sleepSource: sleep?.source,
    hasSuccessfulSync: (syncResult.data?.length ?? 0) > 0,
  });

  return {
    metrics,
    metricsSource: resolveMetricsSource(quality, summary?.source),
    qualityScore: quality.quality_score,
  };
  // #endif
}

/**
 * 查询今日健康指标
 * 聚合 daily_summaries、sleep_logs、workout_logs
 */
export async function fetchTodayHealthMetrics(
  userId: string
): Promise<TodayHealthMetrics> {
  const snapshot = await getTodayHealthSnapshot(userId);
  return snapshot.metrics;
}

/**
 * 读取今日 daily_summaries 中的简报缓存
 * 有 ai_brief 时视为已有今日数据
 */
export async function fetchTodayDailySummary(
  userId: string
): Promise<DailySummaryBrief | null> {
  const today = getTodayDateString();

  // #ifdef APP-PLUS
  const accessToken = await ensureAccessToken();
  if (!accessToken) return null;

  try {
    const data = await restSelectMaybeSingle<{
      ai_brief: string | null;
      ai_recovery_score: number | null;
      ai_workout_readiness: WorkoutReadiness | null;
      user_feedback: BriefFeedback | null;
      user_feedback_note: string | null;
      context_snapshot: unknown;
    }>(
      "daily_summaries",
      `user_id=eq.${userId}&date=eq.${today}&select=ai_brief,ai_recovery_score,ai_workout_readiness,user_feedback,user_feedback_note,context_snapshot`,
      accessToken
    );

    if (!data?.ai_brief) return null;

    return {
      brief: stripBriefDisclaimer(data.ai_brief),
      recoveryScore:
        data.ai_recovery_score != null ? Number(data.ai_recovery_score) : null,
      workoutReadiness: data.ai_workout_readiness ?? null,
      feedback: data.user_feedback ?? null,
      feedbackNote: data.user_feedback_note ?? null,
      sleepMissing: extractSleepMissing(data.context_snapshot),
    };
  } catch (error) {
    console.error("[health] 查询 daily_summaries 简报失败:", error);
    throw new Error("读取简报失败");
  }
  // #endif

  // #ifdef H5
  const { data, error } = await supabase
    .from("daily_summaries")
    .select(
      "ai_brief, ai_recovery_score, ai_workout_readiness, user_feedback, user_feedback_note, context_snapshot"
    )
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (error) {
    console.error("[health] 查询 daily_summaries 简报失败:", error.message);
    throw new Error("读取简报失败");
  }

  if (!data?.ai_brief) return null;

  return {
    brief: stripBriefDisclaimer(data.ai_brief),
    recoveryScore:
      data.ai_recovery_score != null ? Number(data.ai_recovery_score) : null,
    workoutReadiness: (data.ai_workout_readiness as WorkoutReadiness | null) ?? null,
    feedback: (data.user_feedback as BriefFeedback | null) ?? null,
    feedbackNote: data.user_feedback_note ?? null,
    sleepMissing: extractSleepMissing(data.context_snapshot),
  };
  // #endif
}

function extractSleepMissing(snapshot: unknown): boolean | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const obj = snapshot as {
    recovery?: { sleep_missing?: boolean };
    data_quality?: { has_sleep?: boolean };
  };
  if (typeof obj.recovery?.sleep_missing === "boolean") {
    return obj.recovery.sleep_missing;
  }
  if (typeof obj.data_quality?.has_sleep === "boolean") {
    return !obj.data_quality.has_sleep;
  }
  return null;
}

/** 将 daily_summaries 缓存转为展示数据 */
export function toMorningBriefData(
  summary: DailySummaryBrief
): MorningBriefData | null {
  if (!summary.brief || summary.recoveryScore == null || !summary.workoutReadiness) {
    return null;
  }

  return {
    brief: stripBriefDisclaimer(summary.brief),
    recoveryScore: summary.recoveryScore,
    workoutReadiness: summary.workoutReadiness,
    feedback: summary.feedback ?? null,
    feedbackNote: summary.feedbackNote ?? null,
    sleepMissing: summary.sleepMissing ?? null,
  };
}

/**
 * 加载首页所需的 Supabase 健康数据
 */
export async function fetchHomePageData(userId: string): Promise<HomePageData> {
  return getTodayHealthSnapshot(userId);
}

export type {
  BriefFeedback,
  DailySummaryBrief,
  HomePageData,
  HomeSnapshot,
  MetricsDataSource,
  MorningBriefData,
  TodayHealthMetrics,
  WorkoutReadiness,
} from "@/lib/health/types";

export {
  HOME_SNAPSHOT_STORAGE_KEY,
  clearPersistedHomeSnapshot,
  readPersistedHomeSnapshot,
  writePersistedHomeSnapshot,
} from "@/lib/health/home-snapshot";

export {
  getBriefFeedbackLabel,
  submitBriefFeedback,
} from "@/lib/health/brief-feedback";

export {
  assessClientDataQuality,
  formatMetricsSourceLabel,
  resolveMetricsSource,
} from "@/lib/health/data-quality";

export {
  buildTodayMetricDisplayItems,
  createEmptyTodayHealthMetrics,
  resolveExerciseMinutes,
  splitTodayMetricDisplayItems,
} from "@/lib/health/metrics-display";

export type { TodayMetricDisplayItem } from "@/lib/health/types";

export {
  formatExerciseAttribution,
  formatExerciseTitle,
  getExerciseById,
  getExercisesByIds,
  intensitiesForReadiness,
  listExercises,
  pickPlanCandidates,
  resolveExerciseDemoUrl,
  resolveExerciseDescription,
} from "@/lib/health/exercises";

export type { Exercise, ExerciseQuery } from "@/lib/health/exercises";

export {
  enrichWorkoutPlanMedia,
  fetchTodayCachedWorkoutPlan,
  flattenPlanExerciseIds,
  formatPlanItemTitle,
  readinessLabel,
} from "@/lib/health/workout-plan";

export type { WorkoutPlan, WorkoutPlanItem } from "@/lib/health/workout-plan";

export {
  MOOD_OPTIONS,
  createDefaultMoodLogForm,
  formatMoodDateLabel,
  getMoodEmoji,
  getMoodLabel,
  getMoodMeta,
  getMoodWeekDateKeys,
  getRecentMoodDateOptions,
  summarizeMoodWeek,
  validateMoodLogForm,
} from "@/lib/health/mood";

export type { MoodLogForm, MoodOption, MoodValue } from "@/lib/health/mood";
