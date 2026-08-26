import type { MoodLog, MoodValue } from "@/types/database";

export type { MoodValue };

export interface MoodOption {
  value: MoodValue;
  label: string;
  hint: string;
  emoji: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { value: "great", label: "很好", hint: "精力充沛 · 约 10 分", emoji: "😄" },
  { value: "good", label: "不错", hint: "状态偏上 · 约 9 分", emoji: "🙂" },
  { value: "normal", label: "一般", hint: "平常状态 · 约 8 分", emoji: "😐" },
  { value: "tired", label: "疲惫", hint: "偏累 · 约 4 分", emoji: "😔" },
];

export interface MoodLogForm {
  date: string;
  mood: MoodValue | "";
  note: string;
}

export function createDefaultMoodLogForm(date?: string): MoodLogForm {
  return {
    date: date ?? formatDateYmd(new Date()),
    mood: "",
    note: "",
  };
}

export function formatDateYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getRecentMoodDateOptions(days = 7): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const value = formatDateYmd(d);
    options.push({ value, label: formatMoodDateLabel(value) });
  }
  return options;
}

export function getMoodWeekDateKeys(): string[] {
  return getRecentMoodDateOptions(7).map((item) => item.value);
}

export function formatMoodDateLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const date = new Date(y, m - 1, d);
  const today = formatDateYmd(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  if (ymd === today) return "今天";
  if (ymd === formatDateYmd(yesterday)) return "昨天";
  return `${m}/${d} 周${weekdays[date.getDay()]}`;
}

export function getMoodMeta(mood: string | undefined | null): MoodOption | null {
  return MOOD_OPTIONS.find((item) => item.value === mood) ?? null;
}

export function getMoodLabel(mood: string | undefined | null): string {
  return getMoodMeta(mood)?.label ?? "未记录";
}

export function getMoodEmoji(mood: string | undefined | null): string {
  return getMoodMeta(mood)?.emoji ?? "—";
}

export function validateMoodLogForm(form: MoodLogForm): string | null {
  if (!form.date) return "请选择日期";
  if (!form.mood) return "请选择今日心情";
  if (form.note.trim().length > 200) return "备注不超过 200 字";
  return null;
}

/** 近 7 天心情摘要（历史页） */
export function summarizeMoodWeek(logs: MoodLog[]): {
  count: number;
  topLabel: string;
} {
  const valid = logs.filter((item) => !item.deleted_at && item.mood);
  if (!valid.length) return { count: 0, topLabel: "暂无" };
  const counts = new Map<string, number>();
  for (const item of valid) {
    counts.set(item.mood, (counts.get(item.mood) || 0) + 1);
  }
  let top = valid[0].mood;
  let max = 0;
  for (const [mood, n] of counts) {
    if (n > max) {
      max = n;
      top = mood as MoodValue;
    }
  }
  return { count: valid.length, topLabel: getMoodLabel(top) };
}
