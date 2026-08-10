import type { FitnessLevelValue, WorkoutTimeValue } from "@/types/profile";

/** 新手引导表单数据（分步收集） */
export interface OnboardingFormData {
  age: number | null;
  height_cm: string;
  weight_kg: string;
  fitness_level: FitnessLevelValue | "";
  preferred_workout_time: WorkoutTimeValue | "";
}

/** 完成引导时提交到 Supabase 的载荷 */
export interface OnboardingCompletePayload {
  nickname: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  fitness_level: FitnessLevelValue;
  preferred_workout_time: WorkoutTimeValue;
  onboarding_completed: true;
  updated_at: string;
  last_active_at: string;
}

/** 引导步骤标题 */
export const ONBOARDING_STEPS = [
  "欢迎",
  "健康档案",
  "运动偏好",
  "数据授权",
  "完成",
] as const;

/** 创建默认引导表单 */
export function createDefaultOnboardingForm(): OnboardingFormData {
  return {
    age: null,
    height_cm: "",
    weight_kg: "",
    fitness_level: "",
    preferred_workout_time: "",
  };
}

/** 校验 Step 2：健康档案 */
export function validateOnboardingStep2(form: OnboardingFormData): string | null {
  if (form.age == null) return "请选择年龄";

  const height = Number(form.height_cm);
  if (!form.height_cm.trim() || Number.isNaN(height) || height < 100 || height > 250) {
    return "请填写有效身高（100-250 cm）";
  }

  const weight = Number(form.weight_kg);
  if (!form.weight_kg.trim() || Number.isNaN(weight) || weight < 30 || weight > 200) {
    return "请填写有效体重（30-200 kg）";
  }

  return null;
}

/** 校验 Step 3：运动偏好 */
export function validateOnboardingStep3(form: OnboardingFormData): string | null {
  if (!form.fitness_level) return "请选择运动水平";
  if (!form.preferred_workout_time) return "请选择偏好训练时间";
  return null;
}

/** 按步骤索引校验（Step 1/4/5 无必填项） */
export function validateOnboardingStep(stepIndex: number, form: OnboardingFormData): string | null {
  if (stepIndex === 1) return validateOnboardingStep2(form);
  if (stepIndex === 2) return validateOnboardingStep3(form);
  return null;
}

/** 构建完成引导的 Supabase 载荷 */
export function buildOnboardingPayload(
  form: OnboardingFormData,
  nickname: string
): OnboardingCompletePayload {
  return {
    nickname,
    age: form.age as number,
    height_cm: Number(form.height_cm),
    weight_kg: Number(form.weight_kg),
    fitness_level: form.fitness_level as FitnessLevelValue,
    preferred_workout_time: form.preferred_workout_time as WorkoutTimeValue,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
  };
}
