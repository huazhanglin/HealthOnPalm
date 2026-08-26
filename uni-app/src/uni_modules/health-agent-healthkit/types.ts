/** 睡眠数据 */
export interface HealthKitSleepData {
  totalHours: number;
  deepSleepHours?: number;
  remSleepHours?: number;
  lightSleepHours?: number;
  wakeUps?: number;
}

/** 心率数据 */
export interface HealthKitHeartRateData {
  resting: number | null;
  avg?: number | null;
  max?: number | null;
  walkingAvg?: number | null;
}

/** 今日 HealthKit 聚合数据 */
export interface HealthKitTodayPayload {
  available: boolean;
  date: string;
  steps: number;
  activeCalories: number;
  basalCalories?: number;
  standHours: number;
  exerciseMinutes: number;
  flightsClimbed?: number;
  sleep: HealthKitSleepData | null;
  heartRate: HealthKitHeartRateData | null;
  hrvMs?: number | null;
  spo2Percent?: number | null;
  respiratoryRate?: number | null;
  vo2Max?: number | null;
  workouts?: HKWorkoutRecord[];
  totalDistance?: number;
  error?: string;
}

export type HealthKitAuthResult = "SUCCESS" | string;

/** 单条运动记录 */
export interface HKWorkoutRecord {
  id: string;
  workoutType: string;         // 如 "跑步" / "游泳"
  workoutTypeId: number;       // Apple HKWorkoutActivityType rawValue
  startDate: string;           // ISO datetime
  endDate: string;             // ISO datetime
  duration: number;            // 分钟
  calories?: number;           // kcal
  distance?: number;           // 米
  distanceKm?: number;         // 公里
}
