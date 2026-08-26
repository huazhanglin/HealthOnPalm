/**
 * Edge 侧读取自有动作库（勿直连 wger）
 * Agent 默认只读 is_featured；全库检索另开参数。
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type ExerciseIntensity = "light" | "moderate" | "high";
export type MovementPhase = "warmup" | "main" | "cooldown" | "flexible";

export interface ExerciseRow {
  id: string;
  wger_id: number | null;
  name_en: string;
  name_zh: string;
  category: string;
  category_zh: string;
  movement_phase: MovementPhase;
  intensity: ExerciseIntensity;
  muscles_primary_zh: string[];
  equipment_zh: string[];
  is_bodyweight: boolean;
  is_featured?: boolean;
  description_en: string | null;
  description_zh: string | null;
  attribution: string;
  image_url: string | null;
}

const SELECT =
  "id,wger_id,name_en,name_zh,category,category_zh,movement_phase,intensity,muscles_primary_zh,equipment_zh,is_bodyweight,is_featured,description_en,description_zh,attribution,image_url";

export function intensitiesForReadiness(
  readiness: "train" | "light" | "rest" | null | undefined,
): ExerciseIntensity[] {
  if (readiness === "rest") return ["light"];
  if (readiness === "light") return ["light", "moderate"];
  return ["light", "moderate", "high"];
}

/**
 * Agent 候选：默认 featuredOnly=true
 */
export async function fetchExerciseCandidates(
  supabase: SupabaseClient,
  options: {
    readiness?: "train" | "light" | "rest";
    bodyweightOnly?: boolean;
    featuredOnly?: boolean;
    limit?: number;
  } = {},
): Promise<ExerciseRow[]> {
  const intensities = intensitiesForReadiness(options.readiness);
  const limit = options.limit ?? 40;
  const featuredOnly = options.featuredOnly !== false;

  let q = supabase
    .from("exercises")
    .select(SELECT)
    .eq("is_active", true)
    .in("intensity", intensities)
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (featuredOnly) q = q.eq("is_featured", true);
  if (options.bodyweightOnly) q = q.eq("is_bodyweight", true);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as ExerciseRow[];
}

/** 全库检索（用户点名某动作时） */
export async function searchExercises(
  supabase: SupabaseClient,
  term: string,
  limit = 20,
): Promise<ExerciseRow[]> {
  const q = term.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("exercises")
    .select(SELECT)
    .eq("is_active", true)
    .or(`name_zh.ilike.%${q}%,name_en.ilike.%${q}%`)
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data || []) as ExerciseRow[];
}

/** 压缩成给 LLM 的候选清单（强制从库中选，防幻觉） */
export function formatExerciseCatalogForPrompt(rows: ExerciseRow[]): string {
  if (!rows.length) return "（动作库暂无候选）";
  return rows
    .map((ex, i) => {
      const title = ex.name_zh === ex.name_en
        ? ex.name_zh
        : `${ex.name_zh}（${ex.name_en}）`;
      const muscles = (ex.muscles_primary_zh || []).join("/") || "全身";
      const equip = (ex.equipment_zh || []).join("/") || "徒手";
      return `${i + 1}. [${ex.id}] ${title} | ${ex.category_zh} | ${ex.intensity} | ${ex.movement_phase} | ${muscles} | ${equip}`;
    })
    .join("\n");
}
