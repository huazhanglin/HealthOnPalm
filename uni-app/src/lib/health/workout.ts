import type { WorkoutLog } from "@/types/database";

/** 手动记录可选的运动类型（与 HealthKit 常见类型对齐，便于展示一致） */
export type ManualWorkoutType =
  | "running"
  | "walking"
  | "cycling"
  | "hiking"
  | "swimming"
  | "strength"
  | "hiit"
  | "yoga"
  | "pilates"
  | "badminton"
  | "table_tennis"
  | "basketball"
  | "tennis"
  | "volleyball"
  | "soccer"
  | "dance"
  | "rowing"
  | "elliptical"
  | "other";

export type WorkoutTypeCategory = "cardio" | "strength_flex" | "ball" | "other";

export interface WorkoutTypeOption {
  value: ManualWorkoutType;
  label: string;
  icon: string;
  category: WorkoutTypeCategory;
}

export const WORKOUT_TYPE_CATEGORY_LABELS: Record<WorkoutTypeCategory, string> = {
  cardio: "有氧 / 户外",
  strength_flex: "力量 / 柔韧",
  ball: "球类",
  other: "其他",
};

export const WORKOUT_TYPE_OPTIONS: WorkoutTypeOption[] = [
  { value: "running", label: "跑步", icon: "🏃", category: "cardio" },
  { value: "walking", label: "步行", icon: "🚶", category: "cardio" },
  { value: "cycling", label: "骑行", icon: "🚴", category: "cardio" },
  { value: "hiking", label: "徒步", icon: "🥾", category: "cardio" },
  { value: "swimming", label: "游泳", icon: "🏊", category: "cardio" },
  { value: "elliptical", label: "椭圆机", icon: "⭕", category: "cardio" },
  { value: "rowing", label: "划船机", icon: "🛶", category: "cardio" },

  { value: "strength", label: "力量训练", icon: "🏋️", category: "strength_flex" },
  { value: "hiit", label: "HIIT", icon: "⚡", category: "strength_flex" },
  { value: "yoga", label: "瑜伽/拉伸", icon: "🧘", category: "strength_flex" },
  { value: "pilates", label: "普拉提", icon: "🤸", category: "strength_flex" },
  { value: "dance", label: "舞蹈", icon: "💃", category: "strength_flex" },

  { value: "badminton", label: "羽毛球", icon: "🏸", category: "ball" },
  { value: "table_tennis", label: "乒乓球", icon: "🏓", category: "ball" },
  { value: "basketball", label: "篮球", icon: "🏀", category: "ball" },
  { value: "tennis", label: "网球", icon: "🎾", category: "ball" },
  { value: "volleyball", label: "排球", icon: "🏐", category: "ball" },
  { value: "soccer", label: "足球", icon: "⚽", category: "ball" },

  { value: "other", label: "其他", icon: "🏅", category: "other" },
];

/** 按分类分组，供记录页分区展示 */
export function getWorkoutTypesByCategory(): Array<{
  category: WorkoutTypeCategory;
  label: string;
  items: WorkoutTypeOption[];
}> {
  const order: WorkoutTypeCategory[] = ["cardio", "strength_flex", "ball", "other"];
  return order.map((category) => ({
    category,
    label: WORKOUT_TYPE_CATEGORY_LABELS[category],
    items: WORKOUT_TYPE_OPTIONS.filter((item) => item.category === category),
  }));
}
export const DURATION_PRESETS = [15, 30, 45, 60] as const;

/** 手动记录表单 */
export interface WorkoutLogForm {
  date: string;
  workoutType: ManualWorkoutType | "";
  durationMinutes: number;
  perceivedExertion: number;
  notes: string;
  /** 关联动作库 id（来自今日计划打卡） */
  exerciseIds?: string[];
  /** 覆盖展示名 */
  workoutName?: string;
  source?: "user_logged" | "ai_suggested";
}

/** 创建默认表单（默认今天、30 分钟、疲劳度 5） */
export function createDefaultWorkoutLogForm(date?: string): WorkoutLogForm {
  return {
    date: date ?? formatDateYmd(new Date()),
    workoutType: "",
    durationMinutes: 30,
    perceivedExertion: 5,
    notes: "",
  };
}

/** 格式化为 YYYY-MM-DD */
export function formatDateYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 近 N 天日期列表（含今天，从旧到新） */
export function getRecentDateOptions(days = 7): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const value = formatDateYmd(d);
    options.push({ value, label: formatDateLabel(d, value) });
  }
  return options;
}

/** 本周 7 天（周一到周日，或近 7 天滚动）—— 用近 7 天滚动更贴近 MVP */
export function getWeekDateKeys(): string[] {
  return getRecentDateOptions(7).map((item) => item.value);
}

function formatDateLabel(date: Date, ymd: string): string {
  const today = formatDateYmd(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (ymd === today) return "今天";
  if (ymd === formatDateYmd(yesterday)) return "昨天";
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return `${date.getMonth() + 1}/${date.getDate()} 周${weekdays[date.getDay()]}`;
}

/** 展示用日期文案 */
export function formatWorkoutDateLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return formatDateLabel(new Date(y, m - 1, d), ymd);
}

export function getWorkoutTypeMeta(type: string | undefined): WorkoutTypeOption | null {
  return WORKOUT_TYPE_OPTIONS.find((item) => item.value === type) ?? null;
}

export function getWorkoutTypeLabel(type: string | undefined): string {
  if (!type) return "运动";
  const meta = getWorkoutTypeMeta(type);
  if (meta) return meta.label;
  // HealthKit 旧数据兜底：运动(4) → 羽毛球
  const rawMatch = /^运动\((\d+)\)$/.exec(type);
  if (rawMatch) {
    return resolveHealthKitTypeByRawValue(Number(rawMatch[1]));
  }
  return type;
}

/** HealthKit workoutTypeId → 中文名（展示已同步旧数据） */
export function resolveHealthKitTypeByRawValue(raw: number): string {
  const map: Record<number, string> = {
    1: "美式足球",
    2: "射箭",
    3: "澳式足球",
    4: "羽毛球",
    5: "棒球",
    6: "篮球",
    7: "保龄球",
    8: "拳击",
    9: "攀岩",
    10: "板球",
    13: "骑行",
    20: "力量训练",
    24: "徒步",
    37: "跑步",
    41: "足球",
    46: "游泳",
    47: "乒乓球",
    48: "网球",
    50: "传统力量训练",
    51: "排球",
    52: "步行",
    57: "瑜伽",
    63: "HIIT",
    66: "普拉提",
  };
  return map[raw] ?? `运动(${raw})`;
}

/** 展示运动记录名称（优先 name，其次 type / typeId） */
export function getWorkoutDisplayName(log: {
  workout_name?: string;
  workout_type?: string;
  workout_type_id?: number;
}): string {
  const name = log.workout_name?.trim();
  if (name && !/^运动\(\d+\)$/.test(name)) {
    return name;
  }
  if (log.workout_type_id != null) {
    return resolveHealthKitTypeByRawValue(log.workout_type_id);
  }
  return getWorkoutTypeLabel(log.workout_type || name);
}

export function getWorkoutTypeIcon(type: string | undefined): string {
  return getWorkoutTypeMeta(type)?.icon ?? "🏋️";
}

/** 疲劳度文案 */
export function getExertionLabel(value: number): string {
  if (value <= 2) return "很轻松";
  if (value <= 4) return "较轻松";
  if (value <= 6) return "中等";
  if (value <= 8) return "较累";
  return "精疲力竭";
}

/** 校验手动记录表单 */
export function validateWorkoutLogForm(form: WorkoutLogForm): string | null {
  if (!form.workoutType) return "请选择运动类型";
  if (!form.date) return "请选择日期";
  if (
    !Number.isFinite(form.durationMinutes) ||
    form.durationMinutes < 1 ||
    form.durationMinutes > 600
  ) {
    return "请填写有效时长（1-600 分钟）";
  }
  if (
    !Number.isFinite(form.perceivedExertion) ||
    form.perceivedExertion < 1 ||
    form.perceivedExertion > 10
  ) {
    return "疲劳度需在 1-10 之间";
  }
  return null;
}

/** 周汇总 */
export interface WorkoutWeekSummary {
  count: number;
  totalMinutes: number;
  topType: string | null;
  topTypeLabel: string;
}

export function summarizeWorkouts(logs: WorkoutLog[]): WorkoutWeekSummary {
  const count = logs.length;
  const totalMinutes = logs.reduce(
    (sum, item) => sum + (item.duration_minutes ?? 0),
    0
  );

  const typeCount = new Map<string, number>();
  for (const log of logs) {
    const key = log.workout_type || "other";
    typeCount.set(key, (typeCount.get(key) ?? 0) + 1);
  }

  let topType: string | null = null;
  let topCount = 0;
  typeCount.forEach((c, key) => {
    if (c > topCount) {
      topCount = c;
      topType = key;
    }
  });

  return {
    count,
    totalMinutes,
    topType,
    topTypeLabel: topType ? getWorkoutDisplayName({ workout_type: topType }) : "暂无",
  };
}

/** 按日期分组 */
export function groupWorkoutsByDate(
  logs: WorkoutLog[]
): { date: string; label: string; items: WorkoutLog[] }[] {
  const map = new Map<string, WorkoutLog[]>();
  for (const log of logs) {
    const list = map.get(log.date) ?? [];
    list.push(log);
    map.set(log.date, list);
  }

  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({
      date,
      label: formatWorkoutDateLabel(date),
      items,
    }));
}

/** 来源展示 */
export function formatWorkoutSource(source?: string): string {
  if (source === "healthkit_sync") return "HealthKit";
  if (source === "ai_suggested") return "AI 建议";
  return "手动";
}
