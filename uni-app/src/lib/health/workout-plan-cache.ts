import type { WorkoutPlan } from "@/lib/health/workout-plan";
import { uniAuthStorage, getStorageJson, setStorageJson } from "@/utils/storage";

export const WORKOUT_PLAN_STORAGE_KEY = "health-agent-workout-plan";

export interface WorkoutPlanSnapshot {
  userId: string;
  date: string;
  plan: WorkoutPlan;
  updatedAt: number;
}

function todayYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function workoutPlanTodayYmd(): string {
  return todayYmd();
}

function isWorkoutPlan(value: unknown): value is WorkoutPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as WorkoutPlan;
  return plan.version === 1 && Array.isArray(plan.main);
}

function isSnapshot(value: unknown): value is WorkoutPlanSnapshot {
  if (!value || typeof value !== "object") return false;
  const snap = value as WorkoutPlanSnapshot;
  return (
    typeof snap.userId === "string" &&
    typeof snap.date === "string" &&
    typeof snap.updatedAt === "number" &&
    isWorkoutPlan(snap.plan)
  );
}

export function parseWorkoutPlan(raw: unknown): WorkoutPlan | null {
  if (isWorkoutPlan(raw)) return raw;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    return parseWorkoutPlan(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function readPersistedWorkoutPlan(userId: string): WorkoutPlanSnapshot | null {
  const stored = getStorageJson<unknown>(WORKOUT_PLAN_STORAGE_KEY);
  if (!isSnapshot(stored)) return null;
  if (stored.userId !== userId) return null;
  if (stored.date !== todayYmd()) {
    clearPersistedWorkoutPlan();
    return null;
  }
  return stored;
}

export function writePersistedWorkoutPlan(userId: string, plan: WorkoutPlan): void {
  const snapshot: WorkoutPlanSnapshot = {
    userId,
    date: todayYmd(),
    plan,
    updatedAt: Date.now(),
  };
  setStorageJson(WORKOUT_PLAN_STORAGE_KEY, snapshot);
}

export function clearPersistedWorkoutPlan(): void {
  uniAuthStorage.removeItem(WORKOUT_PLAN_STORAGE_KEY);
}
