/**
 * 首页数据快照：Tab 使用 redirectTo 会销毁页面，
 * 用 Pinia 跨页保留，避免每次回到首页都全量请求。
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import type {
  MetricsDataSource,
  MorningBriefData,
  TodayHealthMetrics,
} from "@/lib/health/types";
import { createEmptyTodayHealthMetrics } from "@/lib/health/metrics-display";
import { HOME_DATA_TTL_MS, isFresh as isStampFresh } from "@/utils/freshness";

export interface HomeSnapshot {
  userId: string;
  /** YYYY-MM-DD，跨日自动失效 */
  date: string;
  brief: MorningBriefData | null;
  metrics: TodayHealthMetrics;
  metricsSource: MetricsDataSource;
  qualityScore: number;
  updatedAt: number;
}

function todayYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const useHomeStore = defineStore("home", () => {
  const snapshot = ref<HomeSnapshot | null>(null);

  function markStale(): void {
    if (!snapshot.value) return;
    snapshot.value = { ...snapshot.value, updatedAt: 0 };
  }

  function clear(): void {
    snapshot.value = null;
  }

  function hasUsableSnapshot(userId: string): boolean {
    const s = snapshot.value;
    if (!s || s.userId !== userId) return false;
    if (s.date !== todayYmd()) return false;
    return s.brief != null;
  }

  function isFresh(userId: string, ttlMs = HOME_DATA_TTL_MS): boolean {
    if (!hasUsableSnapshot(userId)) return false;
    // 与 invalidateFresh(`home:…`) 共用 stamp，记录页写入后可强制后台刷新
    if (!isStampFresh(`home:${userId}`, ttlMs)) return false;
    return Date.now() - (snapshot.value?.updatedAt ?? 0) < ttlMs;
  }

  function save(payload: {
    userId: string;
    brief: MorningBriefData | null;
    metrics: TodayHealthMetrics;
    metricsSource: MetricsDataSource;
    qualityScore: number;
  }): void {
    snapshot.value = {
      userId: payload.userId,
      date: todayYmd(),
      brief: payload.brief,
      metrics: payload.metrics,
      metricsSource: payload.metricsSource,
      qualityScore: payload.qualityScore,
      updatedAt: Date.now(),
    };
  }

  /** 用快照更新本地状态引用（由页面传入 setter） */
  function readSnapshot(userId: string): HomeSnapshot | null {
    if (!hasUsableSnapshot(userId)) return null;
    return snapshot.value;
  }

  function emptyMetrics(): TodayHealthMetrics {
    return createEmptyTodayHealthMetrics();
  }

  return {
    snapshot,
    clear,
    markStale,
    hasUsableSnapshot,
    isFresh,
    save,
    readSnapshot,
    emptyMetrics,
  };
});
