/**
 * 前端数据质量展示（与 Edge Function T9 规则对齐）
 */

export type MetricsDataSource = "healthkit" | "hybrid" | "mock" | "unknown";

export interface ClientDataQuality {
  has_steps: boolean;
  has_sleep: boolean;
  has_calories: boolean;
  has_stand_hours: boolean;
  quality_score: number;
  has_successful_sync: boolean;
}

export function assessClientDataQuality(input: {
  steps: number | null | undefined;
  sleepHours: number | null | undefined;
  activeCalories: number | null | undefined;
  standHours: number | null | undefined;
  summarySource?: string | null;
  sleepSource?: string | null;
  hasSuccessfulSync?: boolean;
}): ClientDataQuality {
  const summaryReal =
    input.summarySource === "healthkit" ||
    (!!input.hasSuccessfulSync && input.summarySource !== "mock");
  const sleepReal =
    input.sleepSource === "healthkit_sync" ||
    (input.sleepHours != null &&
      input.sleepHours > 0 &&
      input.sleepSource !== "mock" &&
      (input.sleepSource === "user_logged" ||
        input.sleepSource === "manual" ||
        !!input.hasSuccessfulSync));

  const has_steps = summaryReal && input.steps != null && input.steps > 0;
  const has_calories =
    summaryReal && input.activeCalories != null && input.activeCalories > 0;
  const has_stand_hours =
    summaryReal && input.standHours != null && input.standHours > 0;
  const has_sleep = sleepReal && input.sleepHours != null && input.sleepHours > 0;

  const quality_score =
    [has_steps, has_sleep, has_calories, has_stand_hours].filter(Boolean).length * 25;

  return {
    has_steps,
    has_sleep,
    has_calories,
    has_stand_hours,
    quality_score,
    has_successful_sync: !!input.hasSuccessfulSync,
  };
}

export function resolveMetricsSource(
  quality: ClientDataQuality,
  summarySource?: string | null
): MetricsDataSource {
  if (quality.quality_score >= 75) return "healthkit";
  if (quality.quality_score > 0) return "hybrid";
  if (summarySource === "mock") return "mock";
  if (summarySource === "healthkit") return "hybrid";
  return quality.has_successful_sync ? "hybrid" : "unknown";
}

export function formatMetricsSourceLabel(source: MetricsDataSource): string {
  switch (source) {
    case "healthkit":
      return "HealthKit";
    case "hybrid":
      return "部分同步";
    case "mock":
      return "参考数据";
    default:
      return "暂无同步";
  }
}
