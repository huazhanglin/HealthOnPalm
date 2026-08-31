/**
 * 页面数据新鲜度：避免 tab / 返回时无差别全量刷新
 */
const stamps = new Map<string, number>();

/** 在 TTL 内视为仍新鲜 */
export function isFresh(key: string, ttlMs: number): boolean {
  const at = stamps.get(key);
  if (at == null) return false;
  return Date.now() - at < ttlMs;
}

export function markFresh(key: string): void {
  stamps.set(key, Date.now());
}

export function invalidateFresh(key: string): void {
  stamps.delete(key);
}

/** 按前缀批量失效，如 home: / workout-history: */
export function invalidateFreshByPrefix(prefix: string): void {
  for (const key of Array.from(stamps.keys())) {
    if (key.startsWith(prefix)) {
      stamps.delete(key);
    }
  }
}

/** 常用 TTL */
export const HOME_DATA_TTL_MS = 5 * 60 * 1000;
export const CHAT_HISTORY_TTL_MS = 5 * 60 * 1000;
export const WORKOUT_PLAN_TTL_MS = 5 * 60 * 1000;
export const PROFILE_DATA_TTL_MS = 2 * 60 * 1000;
export const HISTORY_DATA_TTL_MS = 60 * 1000;
