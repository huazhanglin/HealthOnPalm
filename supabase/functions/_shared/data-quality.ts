/**
 * W3-T9：数据质量评估与真实/Mock 无缝合并
 */

export interface DataQuality {
  has_steps: boolean;
  has_sleep: boolean;
  has_calories: boolean;
  has_stand_hours: boolean;
  /** 0-100，每项真实数据 25 分 */
  quality_score: number;
  /** 当日是否有成功的 HealthKit 同步日志 */
  has_successful_sync: boolean;
}

export type HealthDataSource = "healthkit" | "hybrid" | "mock";

export interface BriefHealthData {
  steps: number;
  active_calories: number;
  stand_hours: number;
  sleep: {
    total_hours: number;
    deep_sleep_hours: number;
    light_sleep_hours: number;
    rem_sleep_hours: number;
    wake_ups: number;
    sleep_quality_score: number;
  };
  heart_rate: {
    resting: number;
    avg: number;
    max: number;
  };
  mood: string;
  workout_done: boolean;
}

export interface ResolvedHealthBundle {
  healthData: BriefHealthData;
  quality: DataQuality;
  source: HealthDataSource;
  /** 已有 HealthKit 行时，保存简报不得覆盖步数等指标 */
  preserveMetrics: boolean;
}

type SupabaseLike = {
  from: (table: string) => any;
};

export function scoreDataQuality(flags: {
  has_steps: boolean;
  has_sleep: boolean;
  has_calories: boolean;
  has_stand_hours: boolean;
  has_successful_sync?: boolean;
}): DataQuality {
  const quality_score =
    [flags.has_steps, flags.has_sleep, flags.has_calories, flags.has_stand_hours].filter(
      Boolean
    ).length * 25;

  return {
    has_steps: flags.has_steps,
    has_sleep: flags.has_sleep,
    has_calories: flags.has_calories,
    has_stand_hours: flags.has_stand_hours,
    quality_score,
    has_successful_sync: !!flags.has_successful_sync,
  };
}

export async function assessDataQuality(
  supabase: SupabaseLike,
  userId: string,
  date: string
): Promise<DataQuality> {
  const [{ data: syncLogs }, { data: dailySummary }, { data: sleepLog }] =
    await Promise.all([
      supabase
        .from("sync_logs")
        .select("id, source, status")
        .eq("user_id", userId)
        .eq("sync_date", date)
        .eq("status", "success")
        .order("synced_at", { ascending: false })
        .limit(1),
      supabase
        .from("daily_summaries")
        .select("steps, active_calories, stand_hours, source")
        .eq("user_id", userId)
        .eq("date", date)
        .maybeSingle(),
      supabase
        .from("sleep_logs")
        .select("total_sleep_hours, source")
        .eq("user_id", userId)
        .eq("date", date)
        .maybeSingle(),
    ]);

  const syncLog = Array.isArray(syncLogs) ? syncLogs[0] : syncLogs;
  const hasSuccessfulSync = !!syncLog;

  // 真实步数/卡路里/站立：HealthKit 同步，或有成功同步日志且数值有效
  const summaryIsReal =
    dailySummary?.source === "healthkit" ||
    (hasSuccessfulSync && dailySummary != null && dailySummary.source !== "mock");

  const sleepIsReal =
    sleepLog?.source === "healthkit_sync" ||
    (sleepLog?.total_sleep_hours != null &&
      Number(sleepLog.total_sleep_hours) > 0 &&
      sleepLog.source !== "mock");

  const has_steps =
    summaryIsReal &&
    dailySummary?.steps != null &&
    Number(dailySummary.steps) > 0;
  const has_calories =
    summaryIsReal &&
    dailySummary?.active_calories != null &&
    Number(dailySummary.active_calories) > 0;
  const has_stand_hours =
    summaryIsReal &&
    dailySummary?.stand_hours != null &&
    Number(dailySummary.stand_hours) > 0;
  const has_sleep =
    !!sleepIsReal &&
    sleepLog?.total_sleep_hours != null &&
    Number(sleepLog.total_sleep_hours) > 0;

  return scoreDataQuality({
    has_steps,
    has_sleep,
    has_calories,
    has_stand_hours,
    has_successful_sync: hasSuccessfulSync,
  });
}

export function mergeHealthData(
  real: Partial<BriefHealthData> | null,
  mock: BriefHealthData,
  quality: DataQuality
): Omit<ResolvedHealthBundle, "preserveMetrics"> {
  const sleepReal = real?.sleep;
  const healthData: BriefHealthData = {
    steps: quality.has_steps && real?.steps != null ? Number(real.steps) : mock.steps,
    active_calories:
      quality.has_calories && real?.active_calories != null
        ? Number(real.active_calories)
        : mock.active_calories,
    stand_hours:
      quality.has_stand_hours && real?.stand_hours != null
        ? Number(real.stand_hours)
        : mock.stand_hours,
    sleep: {
      total_hours:
        quality.has_sleep && sleepReal?.total_hours != null
          ? Number(sleepReal.total_hours)
          : mock.sleep.total_hours,
      deep_sleep_hours:
        quality.has_sleep && sleepReal?.deep_sleep_hours != null
          ? Number(sleepReal.deep_sleep_hours)
          : mock.sleep.deep_sleep_hours,
      light_sleep_hours:
        quality.has_sleep && sleepReal?.light_sleep_hours != null
          ? Number(sleepReal.light_sleep_hours)
          : mock.sleep.light_sleep_hours,
      rem_sleep_hours:
        quality.has_sleep && sleepReal?.rem_sleep_hours != null
          ? Number(sleepReal.rem_sleep_hours)
          : mock.sleep.rem_sleep_hours,
      wake_ups:
        quality.has_sleep && sleepReal?.wake_ups != null
          ? Number(sleepReal.wake_ups)
          : mock.sleep.wake_ups,
      sleep_quality_score:
        quality.has_sleep && sleepReal?.sleep_quality_score != null
          ? Number(sleepReal.sleep_quality_score)
          : mock.sleep.sleep_quality_score,
    },
    heart_rate: {
      resting: real?.heart_rate?.resting ?? mock.heart_rate.resting,
      avg: real?.heart_rate?.avg ?? mock.heart_rate.avg,
      max: real?.heart_rate?.max ?? mock.heart_rate.max,
    },
    mood: real?.mood ?? mock.mood,
    workout_done: real?.workout_done ?? mock.workout_done,
  };

  let source: HealthDataSource = "mock";
  if (quality.quality_score >= 75) {
    source = "healthkit";
  } else if (quality.quality_score > 0) {
    source = "hybrid";
  }

  return { healthData, quality, source };
}

export function buildLowQualityPromptNote(quality: DataQuality): string {
  if (quality.quality_score >= 75) return "";

  const missing: string[] = [];
  if (!quality.has_steps) missing.push("步数");
  if (!quality.has_sleep) missing.push("睡眠");
  if (!quality.has_calories) missing.push("活动热量");
  if (!quality.has_stand_hours) missing.push("站立时长");

  return `

⚠️ 注意：今日健康数据未完整同步（质量评分：${quality.quality_score}/100${
    missing.length ? `，缺失：${missing.join("、")}` : ""
  }）。
生成建议时请注明「建议仅供参考，部分数据可能不完整」。
避免过于确定性的表述（如「你今天运动量不足」），改为「如果你今天有运动…」这类谨慎说法。`;
}

export function formatDataSourceLabel(source: HealthDataSource | string | null | undefined): string {
  if (source === "healthkit") return "HealthKit";
  if (source === "hybrid") return "部分同步";
  if (source === "mock") return "参考数据";
  return "未知来源";
}
