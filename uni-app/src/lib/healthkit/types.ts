export type {
  HealthKitAuthResult,
  HealthKitHeartRateData,
  HealthKitSleepData,
  HealthKitTodayPayload,
} from "@/uni_modules/health-agent-healthkit/types";

/** MVP 默认请求的 HealthKit 读取类型 */
export const DEFAULT_READ_TYPES = [
  "HKQuantityTypeIdentifierStepCount",
  "HKQuantityTypeIdentifierActiveEnergyBurned",
  "HKQuantityTypeIdentifierAppleExerciseTime",
  "HKCategoryTypeIdentifierAppleStandHour",
  "HKCategoryTypeIdentifierSleepAnalysis",
  "HKQuantityTypeIdentifierRestingHeartRate",
  "HKQuantityTypeIdentifierHeartRate",
  "HKWorkoutTypeIdentifier",
] as const;

/** 同步到 Supabase 前的标准化结构 */
export interface HealthKitSyncPayload {
  date: string;
  steps: number;
  activeCalories: number;
  basalCalories?: number;
  standHours: number;
  exerciseMinutes: number;
  sleepHours: number | null;
  deepSleepHours: number | null;
  remSleepHours: number | null;
  wakeUps: number | null;
  restingHeartRate: number | null;
  avgHeartRate: number | null;
  source: "healthkit";
  workouts?: WorkoutRecord[];
  totalDistance?: number;
}

/** 单条运动记录 */
export interface WorkoutRecord {
  id: string;
  workoutType: string;
  workoutTypeId: number;
  startDate: string;
  endDate: string;
  duration: number;
  calories?: number;
  distance?: number;
  distanceKm?: number;
}
