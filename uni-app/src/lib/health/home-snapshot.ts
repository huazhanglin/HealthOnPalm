import type { HomeSnapshot } from "@/lib/health/types";
import { uniAuthStorage, getStorageJson, setStorageJson } from "@/utils/storage";

/** 今日首页快照（杀进程后仍可秒开） */
export const HOME_SNAPSHOT_STORAGE_KEY = "health-agent-home-snapshot";

function todayYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isHomeSnapshot(value: unknown): value is HomeSnapshot {
  if (!value || typeof value !== "object") return false;
  const snap = value as HomeSnapshot;
  return (
    typeof snap.userId === "string" &&
    typeof snap.date === "string" &&
    typeof snap.updatedAt === "number" &&
    typeof snap.qualityScore === "number" &&
    snap.metrics != null &&
    typeof snap.metrics === "object"
  );
}

/** 读取仍属今日、且属于该用户的本地首页快照 */
export function readPersistedHomeSnapshot(userId: string): HomeSnapshot | null {
  const stored = getStorageJson<unknown>(HOME_SNAPSHOT_STORAGE_KEY);
  if (!isHomeSnapshot(stored)) return null;
  if (stored.userId !== userId) return null;
  if (stored.date !== todayYmd()) {
    clearPersistedHomeSnapshot();
    return null;
  }
  return stored;
}

/** 写入今日首页快照 */
export function writePersistedHomeSnapshot(snapshot: HomeSnapshot): void {
  setStorageJson(HOME_SNAPSHOT_STORAGE_KEY, snapshot);
}

/** 登出或跨日时清掉本地首页快照 */
export function clearPersistedHomeSnapshot(): void {
  uniAuthStorage.removeItem(HOME_SNAPSHOT_STORAGE_KEY);
}
