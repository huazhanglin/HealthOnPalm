/**
 * 恢复分计算（可被 recovery-score Edge Function 与 morning-brief 共用）
 *
 * 维度：睡眠 40 + 休息平衡 30 + 活动 20 + 心情 10 = 100
 */

export type RecoveryMood = "great" | "good" | "normal" | "tired";

export interface RecoveryInput {
  sleep_hours: number;
  sleep_quality_score: number;
  /** 从今天往前连续无训练天数（今天有训练则为 0） */
  rest_days_consecutive: number;
  /** 近 7 天（含今天）无训练的天数，0–7 */
  rest_days_in_last_7?: number;
  steps: number;
  mood: RecoveryMood;
  /** false：无真实睡眠，用 80% 中性分，不用 0 也不用 mock 时长 */
  has_real_sleep?: boolean;
}

export interface RecoveryBreakdown {
  sleep_score: number;
  rest_score: number;
  activity_score: number;
  mood_score: number;
}

export interface RecoveryResult {
  score: number;
  breakdown: RecoveryBreakdown;
  recommendation: "train" | "light" | "rest";
  /** 睡眠维度是否因缺真实数据使用了中性分 */
  sleep_missing: boolean;
}

/** 无真实睡眠：按睡眠维满分的 80% 给中性分（40 × 0.8 = 32） */
export const NEUTRAL_SLEEP_SCORE = 32;

/**
 * 休息平衡分（满分 30）
 * - 连续休息：每天 +10，封顶 30（连休 3 天满额）
 * - 近 7 天休息天数：适配「练 7 休 2」——有规律休息不应因「今天练了」被打成 0
 * 取两者较高值。
 */
export function scoreRestComponent(
  consecutiveRestDays: number,
  restDaysInLast7: number,
): number {
  const consecutiveScore = Math.min(30, Math.max(0, consecutiveRestDays) * 10);

  const weekly = Math.max(0, Math.min(7, Math.round(restDaysInLast7)));
  let weeklyScore = 10;
  if (weekly >= 4) weeklyScore = 28;
  else if (weekly >= 2) weeklyScore = 30;
  else if (weekly === 1) weeklyScore = 22;
  else weeklyScore = 10;

  return Math.max(consecutiveScore, weeklyScore);
}

export function calculateRecoveryScore(data: RecoveryInput): RecoveryResult {
  const {
    sleep_hours,
    sleep_quality_score,
    rest_days_consecutive,
    rest_days_in_last_7 = 0,
    steps,
    mood,
    has_real_sleep = true,
  } = data;

  let sleepScore: number;
  if (!has_real_sleep) {
    sleepScore = NEUTRAL_SLEEP_SCORE;
  } else {
    const sleepTarget = 7.5;
    const sleepRatio = Math.min(1.3, Math.max(0, sleep_hours / sleepTarget));
    sleepScore = Math.min(40, sleepRatio * 30 + (sleep_quality_score / 100) * 10);
  }

  const restScore = scoreRestComponent(rest_days_consecutive, rest_days_in_last_7);

  const stepsRatio = Math.min(1.5, Math.max(0, steps) / 8000);
  const activityScore = Math.min(20, stepsRatio * 13.3);

  // 一般情况（normal）约 8/10；疲惫明显扣分
  const moodScores: Record<RecoveryMood, number> = {
    great: 10,
    good: 9,
    normal: 8,
    tired: 4,
  };
  const moodScore = moodScores[mood] ?? 8;

  const score = Math.round(sleepScore + restScore + activityScore + moodScore);

  let recommendation: "train" | "light" | "rest";
  if (score >= 80) recommendation = "train";
  else if (score >= 50) recommendation = "light";
  else recommendation = "rest";

  return {
    score,
    breakdown: {
      sleep_score: Math.round(sleepScore * 10) / 10,
      rest_score: Math.round(restScore * 10) / 10,
      activity_score: Math.round(activityScore * 10) / 10,
      mood_score: Math.round(moodScore * 10) / 10,
    },
    recommendation,
    sleep_missing: !has_real_sleep,
  };
}

/** 从今天往前数连续无训练日（含今天）；当天有训练则为 0 */
export function countConsecutiveRestDaysFromSet(
  workoutDates: Set<string>,
  todayYmd: string,
  maxLookback = 7,
): number {
  const [y, m, d] = todayYmd.split("-").map(Number);
  if (!y || !m || !d) return 0;

  const cursor = new Date(y, m - 1, d);
  let consecutive = 0;
  for (let i = 0; i < maxLookback; i += 1) {
    const key = formatYmdLocal(cursor);
    if (workoutDates.has(key)) break;
    consecutive += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return consecutive;
}

/** 近 7 天（含今天）无训练日数量 */
export function countRestDaysInLast7FromSet(
  workoutDates: Set<string>,
  todayYmd: string,
): number {
  const [y, m, d] = todayYmd.split("-").map(Number);
  if (!y || !m || !d) return 0;

  const cursor = new Date(y, m - 1, d);
  let rest = 0;
  for (let i = 0; i < 7; i += 1) {
    const key = formatYmdLocal(cursor);
    if (!workoutDates.has(key)) rest += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return rest;
}

export function formatYmdLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysAgoYmd(todayYmd: string, days: number): string {
  const [y, m, d] = todayYmd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - days);
  return formatYmdLocal(date);
}
