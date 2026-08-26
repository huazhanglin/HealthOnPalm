export type {
  HealthKitAuthResult,
  HealthKitHeartRateData,
  HealthKitSleepData,
  HealthKitTodayPayload,
} from "@/uni_modules/health-agent-healthkit/types";

/** MVP 默认请求的 HealthKit 读取类型（活动 + 睡眠 + 心肺恢复指标） */
export const DEFAULT_READ_TYPES = [
  "HKQuantityTypeIdentifierStepCount",
  "HKQuantityTypeIdentifierActiveEnergyBurned",
  "HKQuantityTypeIdentifierBasalEnergyBurned",
  "HKQuantityTypeIdentifierAppleExerciseTime",
  "HKQuantityTypeIdentifierDistanceWalkingRunning",
  "HKQuantityTypeIdentifierFlightsClimbed",
  "HKCategoryTypeIdentifierAppleStandHour",
  "HKCategoryTypeIdentifierSleepAnalysis",
  "HKQuantityTypeIdentifierRestingHeartRate",
  "HKQuantityTypeIdentifierHeartRate",
  "HKQuantityTypeIdentifierWalkingHeartRateAverage",
  "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
  "HKQuantityTypeIdentifierOxygenSaturation",
  "HKQuantityTypeIdentifierRespiratoryRate",
  "HKQuantityTypeIdentifierVO2Max",
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
  flightsClimbed?: number | null;
  sleepHours: number | null;
  deepSleepHours: number | null;
  remSleepHours: number | null;
  lightSleepHours?: number | null;
  wakeUps: number | null;
  restingHeartRate: number | null;
  avgHeartRate: number | null;
  maxHeartRate?: number | null;
  walkingHeartRateAvg?: number | null;
  hrvMs?: number | null;
  spo2Percent?: number | null;
  respiratoryRate?: number | null;
  vo2Max?: number | null;
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
