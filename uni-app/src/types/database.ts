/** 用户档案（对应 public.users 表） */
export interface User {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  nickname?: string;
  avatar_url?: string;
  age?: number;
  gender?: "male" | "female" | "other";
  height_cm?: number;
  weight_kg?: number;
  occupation?: string;
  sleep_goal_hours?: number;
  fitness_level?: "beginner" | "intermediate" | "advanced";
  preferred_workout_time?: "morning" | "noon" | "evening" | "flexible";
  workout_duration_preference?: number;
  subscription_tier: "free" | "pro" | "premium";
  subscription_expires_at?: string;
  onboarding_completed: boolean;
  last_active_at: string;
}

/** 每日健康摘要（对应 public.daily_summaries 表） */
export interface DailySummary {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  user_id: string;
  date: string;
  steps?: number;
  active_calories?: number;
  basal_calories?: number;
  stand_hours?: number;
  exercise_minutes?: number;
  resting_heart_rate?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  walking_hr_avg?: number;
  hrv_ms?: number;
  spo2_percent?: number;
  respiratory_rate?: number;
  flights_climbed?: number;
  vo2_max?: number;
  total_workouts?: number;
  total_distance_meters?: number;
  has_workout?: boolean;
  source?: "healthkit" | "mock" | "manual";
  ai_brief?: string;
  ai_plan?: string;
  ai_recovery_score?: number;
  ai_workout_readiness?: "train" | "light" | "rest";
  user_feedback?: "adopted" | "ignored" | "modified";
  user_feedback_note?: string;
  context_snapshot?: Record<string, unknown>;
}

/** 睡眠记录（对应 public.sleep_logs 表） */
export interface SleepLog {
  id: string;
  created_at: string;
  deleted_at?: string;
  user_id: string;
  date: string;
  total_sleep_hours?: number;
  deep_sleep_hours?: number;
  light_sleep_hours?: number;
  rem_sleep_hours?: number;
  wake_ups?: number;
  sleep_quality_score?: number;
  sleep_start_time?: string;
  sleep_end_time?: string;
  ai_sleep_insight?: string;
  source?: "healthkit_sync" | "user_logged" | "manual";
}

/** 运动记录（对应 public.workout_logs 表） */
export interface WorkoutLog {
  id: string;
  created_at: string;
  deleted_at?: string;
  user_id: string;
  date: string;
  workout_id?: string;
  workout_type?: string;
  workout_name?: string;
  workout_type_id?: number;
  started_at?: string;
  ended_at?: string;
  duration_minutes?: number;
  calories_burned?: number;
  distance_meters?: number;
  distance_km?: number;
  perceived_exertion?: number;
  mood_after?: "great" | "good" | "normal" | "tired" | "exhausted";
  notes?: string;
  source?: "user_logged" | "ai_suggested" | "healthkit_sync";
  /** 关联 public.exercises.id */
  exercise_ids?: string[];
}

/** 心情枚举（与恢复分一致） */
export type MoodValue = "great" | "good" | "normal" | "tired";

/** 每日心情（对应 public.mood_logs） */
export interface MoodLog {
  id: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
  user_id: string;
  date: string;
  mood: MoodValue;
  note?: string;
  source?: "user_logged" | "ai_inferred";
}

/** 精选动作库（对应 public.exercises，源自 wger / CC BY-SA） */
export interface ExerciseRow {
  id: string;
  created_at: string;
  updated_at: string;
  slug: string;
  wger_id?: number;
  name_en: string;
  name_zh: string;
  category: string;
  category_zh: string;
  movement_phase: "warmup" | "main" | "cooldown" | "flexible";
  intensity: "light" | "moderate" | "high";
  muscles_primary: string[];
  muscles_primary_zh: string[];
  muscles_secondary: string[];
  muscles_secondary_zh: string[];
  equipment: string[];
  equipment_zh: string[];
  is_bodyweight: boolean;
  description_en?: string;
  description_zh?: string;
  image_url?: string;
  image_thumbnail_url?: string;
  source: string;
  license: string;
  license_url: string;
  license_author?: string;
  attribution: string;
  source_url?: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  sync_hash?: string;
}
