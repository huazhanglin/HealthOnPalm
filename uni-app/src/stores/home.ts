/**
 * 首页数据快照：Tab 页常驻后仍用于冷启动秒开。
 * 用 Pinia + 本地存储跨页/冷启动保留，避免每次回到首页都全量请求。
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import type {
  HomeSnapshot,
  MetricsDataSource,
  MorningBriefData,
  TodayHealthMetrics,
} from "@/lib/health/types";
import {
  clearPersistedHomeSnapshot,
  readPersistedHomeSnapshot,
  writePersistedHomeSnapshot,
} from "@/lib/health/home-snapshot";
import { createEmptyTodayHealthMetrics } from "@/lib/health/metrics-display";
import { HOME_DATA_TTL_MS, isFresh as isStampFresh, markFresh } from "@/utils/freshness";

function todayYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type { HomeSnapshot };

export const useHomeStore = defineStore("home", () => {
  const snapshot = ref<HomeSnapshot | null>(null);
  let diskHydrated = false;

  function hydrateFromDisk(userId: string): void {
    if (diskHydrated) return;
    diskHydrated = true;
    if (snapshot.value) return;
    const stored = readPersistedHomeSnapshot(userId);
    if (!stored) return;
    snapshot.value = stored;
    if (stored.updatedAt > 0 && Date.now() - stored.updatedAt < HOME_DATA_TTL_MS) {
      markFresh(`home:${userId}`);
    }
  }

  function markStale(): void {
    if (!snapshot.value) return;
    snapshot.value = { ...snapshot.value, updatedAt: 0 };
  }

  function clear(): void {
    snapshot.value = null;
    diskHydrated = false;
    clearPersistedHomeSnapshot();
  }

  function hasUsableSnapshot(userId: string): boolean {
    hydrateFromDisk(userId);
    const s = snapshot.value;
    if (!s || s.userId !== userId) return false;
    if (s.date !== todayYmd()) return false;
    return s.brief != null;
  }

  function isFresh(userId: string, ttlMs = HOME_DATA_TTL_MS): boolean {
    if (!hasUsableSnapshot(userId)) return false;
    if ((snapshot.value?.updatedAt ?? 0) === 0) return false;
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
    writePersistedHomeSnapshot(snapshot.value);
    diskHydrated = true;
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
