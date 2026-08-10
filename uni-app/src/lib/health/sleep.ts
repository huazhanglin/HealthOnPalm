import type { SleepLog } from "@/types/database";

/** 手动睡眠记录表单 */
export interface SleepLogForm {
  /** 起床日 / 归属日期 YYYY-MM-DD（默认昨天） */
  date: string;
  /** 就寝 HH:mm */
  bedtime: string;
  /** 起床 HH:mm */
  wakeTime: string;
  /** 质量 1-5 星 */
  qualityStars: number;
  /** 夜间醒来次数 */
  wakeUps: number;
}

/** 创建默认表单 */
export function createDefaultSleepLogForm(): SleepLogForm {
  return {
    date: getYesterdayYmd(),
    bedtime: "23:00",
    wakeTime: "07:00",
    qualityStars: 3,
    wakeUps: 0,
  };
}

export function formatDateYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getYesterdayYmd(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateYmd(d);
}

/** 近 N 天日期选项（含昨天优先展示） */
export function getRecentSleepDateOptions(days = 7): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = days; i >= 1; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const value = formatDateYmd(d);
    options.push({ value, label: formatSleepDateLabel(value) });
  }
  return options;
}

export function getWeekDateKeys(): string[] {
  return getRecentSleepDateOptions(7).map((item) => item.value);
}

export function formatSleepDateLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const date = new Date(y, m - 1, d);
  const today = formatDateYmd(new Date());
  const yesterday = getYesterdayYmd();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  if (ymd === today) return "今天";
  if (ymd === yesterday) return "昨天";
  return `${m}/${d} 周${weekdays[date.getDay()]}`;
}

/** HH:mm → 分钟数 */
export function parseHmToMinutes(hm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** 计算睡眠时长（小时，支持跨天） */
export function calcSleepHours(bedtime: string, wakeTime: string): number | null {
  const bed = parseHmToMinutes(bedtime);
  const wake = parseHmToMinutes(wakeTime);
  if (bed == null || wake == null) return null;

  let minutes = wake - bed;
  if (minutes <= 0) {
    minutes += 24 * 60;
  }
  return Math.round((minutes / 60) * 10) / 10;
}

/** 1-5 星 → 0-100 分 */
export function starsToQualityScore(stars: number): number {
  const clamped = Math.min(5, Math.max(1, Math.round(stars)));
  return clamped * 20;
}

/** 0-100 分 → 1-5 星 */
export function qualityScoreToStars(score: number | null | undefined): number {
  if (score == null || Number.isNaN(score)) return 0;
  return Math.min(5, Math.max(1, Math.round(score / 20)));
}

export function formatStars(stars: number): string {
  const n = Math.min(5, Math.max(0, Math.round(stars)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export function formatSleepSource(source?: string): string {
  if (source === "healthkit_sync") return "HealthKit";
  if (source === "manual") return "手动";
  return "手动";
}

export function formatSleepSourceIcon(source?: string): string {
  if (source === "healthkit_sync") return "📱";
  return "✏️";
}

export function validateSleepLogForm(form: SleepLogForm): string | null {
  if (!form.date) return "请选择日期";
  const hours = calcSleepHours(form.bedtime, form.wakeTime);
  if (hours == null) return "请填写有效的就寝/起床时间";
  if (hours < 1 || hours > 16) return "睡眠时长需在 1-16 小时之间";
  if (form.qualityStars < 1 || form.qualityStars > 5) return "请选择睡眠质量（1-5 星）";
  if (form.wakeUps < 0 || form.wakeUps > 20) return "醒来次数需在 0-20 之间";
  return null;
}

/** 组合 ISO 时间：归属 date + HH:mm（就寝可能在前一天） */
export function buildSleepTimestamps(
  dateYmd: string,
  bedtime: string,
  wakeTime: string
): { sleepStart: string; sleepEnd: string } | null {
  const hours = calcSleepHours(bedtime, wakeTime);
  const bedMin = parseHmToMinutes(bedtime);
  const wakeMin = parseHmToMinutes(wakeTime);
  if (hours == null || bedMin == null || wakeMin == null) return null;

  const [y, m, d] = dateYmd.split("-").map(Number);
  const wakeDate = new Date(y, m - 1, d, Math.floor(wakeMin / 60), wakeMin % 60, 0);
  const bedDate = new Date(wakeDate);
  bedDate.setMinutes(bedDate.getMinutes() - Math.round(hours * 60));

  return {
    sleepStart: toLocalIso(bedDate),
    sleepEnd: toLocalIso(wakeDate),
  };
}

function toLocalIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
}

export interface SleepWeekSummary {
  avgHours: number;
  avgQualityStars: number;
  trend: "up" | "down" | "flat";
  trendLabel: string;
  count: number;
}

export function summarizeSleepLogs(logs: SleepLog[]): SleepWeekSummary {
  const valid = logs.filter((item) => (item.total_sleep_hours ?? 0) > 0);
  const count = valid.length;
  if (count === 0) {
    return {
      avgHours: 0,
      avgQualityStars: 0,
      trend: "flat",
      trendLabel: "→ 暂无数据",
      count: 0,
    };
  }

  const avgHours =
    Math.round(
      (valid.reduce((sum, item) => sum + (item.total_sleep_hours ?? 0), 0) / count) * 10
    ) / 10;

  const scored = valid.filter((item) => item.sleep_quality_score != null);
  const avgQualityStars =
    scored.length > 0
      ? Math.round(
          scored.reduce(
            (sum, item) => sum + qualityScoreToStars(item.sleep_quality_score),
            0
          ) / scored.length
        )
      : 0;

  const sorted = [...valid].sort((a, b) => (a.date < b.date ? -1 : 1));
  let trend: SleepWeekSummary["trend"] = "flat";
  if (sorted.length >= 2) {
    const first = sorted[0]?.total_sleep_hours ?? 0;
    const last = sorted[sorted.length - 1]?.total_sleep_hours ?? 0;
    const diff = last - first;
    if (diff >= 0.5) trend = "up";
    else if (diff <= -0.5) trend = "down";
  }

  const trendLabel =
    trend === "up" ? "↑ 睡眠变长" : trend === "down" ? "↓ 睡眠变短" : "→ 基本持平";

  return { avgHours, avgQualityStars, trend, trendLabel, count };
}

/** 时长条宽度百分比（相对 10 小时） */
export function sleepBarPercent(hours: number | null | undefined): number {
  if (hours == null || hours <= 0) return 0;
  return Math.min(100, Math.round((hours / 10) * 100));
}

/** 离散宽度档位，避免内联 style（相对 10 小时，步进 10%） */
export function sleepBarWidthClass(hours: number | null | undefined): string {
  const p = sleepBarPercent(hours);
  const step = Math.min(100, Math.max(0, Math.round(p / 10) * 10));
  return `bar-w-${step}`;
}
