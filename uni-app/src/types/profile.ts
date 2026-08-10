import type { User } from "@/types/database";

/** 性别选项值 */
export type GenderValue = "male" | "female" | "other";

/** 运动水平选项值 */
export type FitnessLevelValue = "beginner" | "intermediate" | "advanced";

/** 偏好训练时间选项值 */
export type WorkoutTimeValue = "morning" | "noon" | "evening" | "flexible";

/** 用户档案表单数据 */
export interface ProfileFormData {
  nickname: string;
  avatar_url: string;
  age: number | null;
  gender: GenderValue | "";
  height_cm: string;
  weight_kg: string;
  occupation: string;
  sleep_goal_hours: number;
  fitness_level: FitnessLevelValue | "";
  preferred_workout_time: WorkoutTimeValue | "";
  workout_duration_preference: number;
}

/** 可提交到 Supabase 的档案更新载荷 */
export interface ProfileUpdatePayload {
  nickname: string;
  avatar_url?: string;
  age: number;
  gender: GenderValue;
  height_cm: number;
  weight_kg: number;
  occupation?: string;
  sleep_goal_hours: number;
  fitness_level: FitnessLevelValue;
  preferred_workout_time: WorkoutTimeValue;
  workout_duration_preference: number;
  updated_at: string;
  last_active_at: string;
}

/** 表单校验错误 */
export interface ProfileValidationError {
  field: keyof ProfileFormData;
  message: string;
}

/** 性别选项 */
export const GENDER_OPTIONS: { value: GenderValue; label: string }[] = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "other", label: "其他" },
];

/** 运动水平选项 */
export const FITNESS_LEVEL_OPTIONS: { value: FitnessLevelValue; label: string }[] = [
  { value: "beginner", label: "初级" },
  { value: "intermediate", label: "中级" },
  { value: "advanced", label: "高级" },
];

/** 偏好训练时间选项 */
export const WORKOUT_TIME_OPTIONS: { value: WorkoutTimeValue; label: string }[] = [
  { value: "morning", label: "早晨" },
  { value: "noon", label: "中午" },
  { value: "evening", label: "晚上" },
  { value: "flexible", label: "灵活" },
];

/** 年龄选择范围 18-80 岁 */
export const AGE_OPTIONS: number[] = Array.from({ length: 63 }, (_, index) => index + 18);

/** 默认表单值 */
export function createDefaultProfileForm(): ProfileFormData {
  return {
    nickname: "",
    avatar_url: "",
    age: null,
    gender: "",
    height_cm: "",
    weight_kg: "",
    occupation: "",
    sleep_goal_hours: 7.5,
    fitness_level: "",
    preferred_workout_time: "",
    workout_duration_preference: 30,
  };
}

/** 从 Supabase User 映射到表单 */
export function mapUserToProfileForm(user: User | null): ProfileFormData {
  const defaults = createDefaultProfileForm();
  if (!user) return defaults;

  return {
    nickname: user.nickname ?? "",
    avatar_url: user.avatar_url ?? "",
    age: user.age ?? null,
    gender: user.gender ?? "",
    height_cm: user.height_cm != null ? String(user.height_cm) : "",
    weight_kg: user.weight_kg != null ? String(user.weight_kg) : "",
    occupation: user.occupation ?? "",
    sleep_goal_hours: user.sleep_goal_hours ?? 7.5,
    fitness_level: user.fitness_level ?? "",
    preferred_workout_time: user.preferred_workout_time ?? "",
    workout_duration_preference: user.workout_duration_preference ?? 30,
  };
}

/** 校验档案表单，返回第一个错误 */
export function validateProfileForm(form: ProfileFormData): ProfileValidationError | null {
  if (!form.nickname.trim()) {
    return { field: "nickname", message: "请填写昵称" };
  }

  if (form.age == null) {
    return { field: "age", message: "请选择年龄" };
  }

  if (!form.gender) {
    return { field: "gender", message: "请选择性别" };
  }

  const height = Number(form.height_cm);
  if (!form.height_cm.trim() || Number.isNaN(height) || height < 100 || height > 250) {
    return { field: "height_cm", message: "请填写有效身高（100-250 cm）" };
  }

  const weight = Number(form.weight_kg);
  if (!form.weight_kg.trim() || Number.isNaN(weight) || weight < 30 || weight > 200) {
    return { field: "weight_kg", message: "请填写有效体重（30-200 kg）" };
  }

  if (!form.fitness_level) {
    return { field: "fitness_level", message: "请选择运动水平" };
  }

  if (!form.preferred_workout_time) {
    return { field: "preferred_workout_time", message: "请选择偏好训练时间" };
  }

  return null;
}

/** 将表单转换为 Supabase 更新载荷 */
export function mapProfileFormToPayload(form: ProfileFormData): ProfileUpdatePayload {
  return {
    nickname: form.nickname.trim(),
    avatar_url: form.avatar_url || undefined,
    age: form.age as number,
    gender: form.gender as GenderValue,
    height_cm: Number(form.height_cm),
    weight_kg: Number(form.weight_kg),
    occupation: form.occupation.trim() || undefined,
    sleep_goal_hours: form.sleep_goal_hours,
    fitness_level: form.fitness_level as FitnessLevelValue,
    preferred_workout_time: form.preferred_workout_time as WorkoutTimeValue,
    workout_duration_preference: form.workout_duration_preference,
    updated_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
  };
}
