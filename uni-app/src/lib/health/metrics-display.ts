import type {
  TodayHealthMetrics,
  TodayMetricDisplayItem,
} from "@/lib/health/types";

/** 空的今日指标 */
export function createEmptyTodayHealthMetrics(): TodayHealthMetrics {
  return {
    steps: null,
    sleepHours: null,
    deepSleepHours: null,
    remSleepHours: null,
    lightSleepHours: null,
    wakeUps: null,
    activeCalories: null,
    basalCalories: null,
    standHours: null,
    exerciseMinutes: null,
    activityMinutes: null,
    restingHeartRate: null,
    avgHeartRate: null,
    maxHeartRate: null,
    walkingHeartRateAvg: null,
    hrvMs: null,
    spo2Percent: null,
    respiratoryRate: null,
    flightsClimbed: null,
    vo2Max: null,
    totalWorkouts: null,
    totalDistanceMeters: null,
  };
}

function formatInt(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "--";
  return String(Math.round(value));
}

function formatHours(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "--";
  return value.toFixed(1);
}

function formatDistanceKm(meters: number | null | undefined): string {
  if (meters == null || Number.isNaN(meters) || meters <= 0) return "--";
  return (meters / 1000).toFixed(2);
}

/** 运动展示分钟：优先 HealthKit exercise_minutes */
export function resolveExerciseMinutes(metrics: TodayHealthMetrics): number | null {
  if (metrics.exerciseMinutes != null && metrics.exerciseMinutes > 0) {
    return metrics.exerciseMinutes;
  }
  return metrics.activityMinutes;
}

/** 首页默认首行展示的指标 key */
export const PRIMARY_METRIC_KEYS = ["steps", "restingHr", "workouts"] as const;

/**
 * 将今日同步指标转为首页网格展示项（含全部可展示字段）
 */
export function buildTodayMetricDisplayItems(
  metrics: TodayHealthMetrics
): TodayMetricDisplayItem[] {
  return [
    { key: "steps", label: "步数", value: formatInt(metrics.steps), unit: "步" },
    {
      key: "restingHr",
      label: "静息心率",
      value: formatInt(metrics.restingHeartRate),
      unit: "bpm",
    },
    {
      key: "workouts",
      label: "运动次数",
      value: formatInt(metrics.totalWorkouts),
      unit: "次",
    },
    {
      key: "sleep",
      label: "睡眠",
      value: formatHours(metrics.sleepHours),
      unit: "小时",
    },
    {
      key: "deep",
      label: "深睡",
      value: formatHours(metrics.deepSleepHours),
      unit: "小时",
    },
    {
      key: "rem",
      label: "REM",
      value: formatHours(metrics.remSleepHours),
      unit: "小时",
    },
    {
      key: "light",
      label: "浅睡",
      value: formatHours(metrics.lightSleepHours),
      unit: "小时",
    },
    {
      key: "wakeUps",
      label: "醒来",
      value: formatInt(metrics.wakeUps),
      unit: "次",
    },
    {
      key: "activeCal",
      label: "活动热量",
      value: formatInt(metrics.activeCalories),
      unit: "kcal",
    },
    {
      key: "basalCal",
      label: "基础热量",
      value: formatInt(metrics.basalCalories),
      unit: "kcal",
    },
    {
      key: "stand",
      label: "站立",
      value: formatHours(metrics.standHours),
      unit: "小时",
    },
    {
      key: "exercise",
      label: "运动",
      value: formatInt(resolveExerciseMinutes(metrics)),
      unit: "分钟",
    },
    {
      key: "avgHr",
      label: "平均心率",
      value: formatInt(metrics.avgHeartRate),
      unit: "bpm",
    },
    {
      key: "maxHr",
      label: "最高心率",
      value: formatInt(metrics.maxHeartRate),
      unit: "bpm",
    },
    {
      key: "walkHr",
      label: "步行心率",
      value: formatInt(metrics.walkingHeartRateAvg),
      unit: "bpm",
    },
    {
      key: "hrv",
      label: "心率变异",
      value: formatHours(metrics.hrvMs),
      unit: "ms",
    },
    {
      key: "spo2",
      label: "血氧",
      value: formatHours(metrics.spo2Percent),
      unit: "%",
    },
    {
      key: "resp",
      label: "呼吸频率",
      value: formatHours(metrics.respiratoryRate),
      unit: "次/分",
    },
    {
      key: "flights",
      label: "爬楼",
      value: formatInt(metrics.flightsClimbed),
      unit: "层",
    },
    {
      key: "vo2",
      label: "VO₂ Max",
      value: formatHours(metrics.vo2Max),
      unit: "ml",
    },
    {
      key: "distance",
      label: "距离",
      value: formatDistanceKm(metrics.totalDistanceMeters),
      unit: "km",
    },
  ];
}

/** 拆分首行与「更多」折叠项 */
export function splitTodayMetricDisplayItems(metrics: TodayHealthMetrics): {
  primary: TodayMetricDisplayItem[];
  more: TodayMetricDisplayItem[];
} {
  const primaryKeySet = new Set<string>(PRIMARY_METRIC_KEYS);
  const all = buildTodayMetricDisplayItems(metrics);
  return {
    primary: all.filter((item) => primaryKeySet.has(item.key)),
    more: all.filter((item) => !primaryKeySet.has(item.key)),
  };
}
