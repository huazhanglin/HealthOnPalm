/** 首页今日健康指标（含 HealthKit 同步全量字段） */
export interface TodayHealthMetrics {
  /** 今日步数 */
  steps: number | null;
  /** 昨夜睡眠时长（小时） */
  sleepHours: number | null;
  /** 深睡（小时） */
  deepSleepHours: number | null;
  /** REM（小时） */
  remSleepHours: number | null;
  /** 浅睡（小时） */
  lightSleepHours: number | null;
  /** 夜间醒来次数 */
  wakeUps: number | null;
  /** 活动卡路里 */
  activeCalories: number | null;
  /** 基础卡路里 */
  basalCalories: number | null;
  /** 站立小时 */
  standHours: number | null;
  /** HealthKit 运动分钟 */
  exerciseMinutes: number | null;
  /** 由 workout_logs 汇总的活动分钟（兜底） */
  activityMinutes: number | null;
  /** 静息心率 */
  restingHeartRate: number | null;
  /** 平均心率 */
  avgHeartRate: number | null;
  /** 今日运动次数 */
  totalWorkouts: number | null;
  /** 总距离（米） */
  totalDistanceMeters: number | null;
}

/** 训练建议类型 */
export type WorkoutReadiness = "train" | "light" | "rest";

/** 晨报反馈类型 */
export type BriefFeedback = "adopted" | "ignored" | "modified";

/** 今日数据来源（T9） */
export type MetricsDataSource = "healthkit" | "hybrid" | "mock" | "unknown";

/** 今日晨间简报数据 */
export interface MorningBriefData {
  /** AI 简报正文 */
  brief: string;
  /** 恢复分 0-100 */
  recoveryScore: number;
  /** 训练建议 */
  workoutReadiness: WorkoutReadiness;
  /** 用户反馈（如有） */
  feedback?: BriefFeedback | null;
  /** 用户修改备注 */
  feedbackNote?: string | null;
  /** 简报所用数据源 */
  dataSource?: MetricsDataSource | null;
  /** 数据质量分 0-100 */
  qualityScore?: number | null;
}

/** daily_summaries 今日简报缓存 */
export interface DailySummaryBrief {
  brief: string | null;
  recoveryScore: number | null;
  workoutReadiness: WorkoutReadiness | null;
  feedback?: BriefFeedback | null;
  feedbackNote?: string | null;
}

/** 首页数据加载结果 */
export interface HomePageData {
  metrics: TodayHealthMetrics;
  /** 数据来源标识 */
  metricsSource: MetricsDataSource;
  /** 质量分 0-100 */
  qualityScore: number;
}

/** 首页指标展示项 */
export interface TodayMetricDisplayItem {
  key: string;
  label: string;
  value: string;
  unit: string;
}
