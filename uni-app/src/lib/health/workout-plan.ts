/**
 * 今日训练计划（workout-agent 返回结构）
 */

export interface WorkoutPlanItem {
  id: string;
  tips: string;
  name_zh: string;
  name_en: string;
  category_zh: string;
  intensity: string;
  movement_phase: string;
  equipment_zh: string[];
  muscles_primary_zh: string[];
  image_url: string | null;
  attribution: string;
  description: string;
}

export interface WorkoutPlan {
  version: 1;
  title: string;
  reason: string;
  duration_minutes: number;
  estimated_calories: number;
  recovery_score: number;
  workout_readiness: "train" | "light" | "rest";
  warmup: WorkoutPlanItem[];
  main: WorkoutPlanItem[];
  cooldown: WorkoutPlanItem[];
  generated_by: "llm" | "template";
  generated_at: string;
  attribution_note: string;
}

export function flattenPlanExerciseIds(plan: WorkoutPlan): string[] {
  return [...plan.warmup, ...plan.main, ...plan.cooldown].map((item) => item.id);
}

export function readinessLabel(
  readiness: WorkoutPlan["workout_readiness"] | null | undefined
): string {
  if (readiness === "train") return "适合训练";
  if (readiness === "light") return "轻度活动";
  if (readiness === "rest") return "以恢复为主";
  return "今日计划";
}

export function formatPlanItemTitle(item: Pick<WorkoutPlanItem, "name_zh" | "name_en">): string {
  if (!item.name_zh || item.name_zh === item.name_en) return item.name_en;
  return `${item.name_zh}（${item.name_en}）`;
}
