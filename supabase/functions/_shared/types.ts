/** 运动水平 */
export type FitnessLevel = "beginner" | "intermediate" | "advanced";

/** 请求参数 */
export interface MockHealthDataRequest {
  user_id: string;
  fitness_level?: FitnessLevel;
  sleep_goal_hours?: number;
}

/** 模拟健康数据响应 */
export interface MockHealthDataResponse {
  user_id: string;
  date: string;
  steps: number;
  active_calories: number;
  stand_hours: number;
  activity_minutes: number;
  sleep: {
    total_hours: number;
    deep_sleep_hours: number;
    light_sleep_hours: number;
    rem_sleep_hours: number;
    wake_ups: number;
    sleep_quality_score: number;
    sleep_start: string;
    sleep_end: string;
  };
  heart_rate: {
    resting: number;
    avg: number;
    max: number;
  };
  mood: "great" | "good" | "normal" | "tired";
  workout_done: boolean;
}

/** 按运动水平的基础配置 */
export interface FitnessProfile {
  steps: () => number;
  activeCalories: () => number;
  standHours: () => number;
  activityMinutes: () => number;
  restingHeartRate: () => number;
  workoutDoneProbability: number;
}
