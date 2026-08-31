/**
 * 动作库：类型、展示与查询（数据在 public.exercises）
 * UI 只消费本模块，不直接拼 wger / 业务规则。
 */

import { getSupabase } from "@/api/supabase";

/** 对应 public.exercises */
export interface Exercise {
  id: string;
  created_at?: string;
  updated_at?: string;
  slug: string;
  wger_id: number | null;
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
  description_en: string | null;
  description_zh: string | null;
  image_url: string | null;
  image_thumbnail_url: string | null;
  source: string;
  license: string;
  license_url: string;
  license_author: string | null;
  attribution: string;
  source_url: string | null;
  is_active: boolean;
  /** Agent / 今日计划默认候选 */
  is_featured: boolean;
  sort_order: number;
}

export interface ExerciseQuery {
  category?: string;
  intensity?: Exercise["intensity"] | Exercise["intensity"][];
  phase?: Exercise["movement_phase"] | Exercise["movement_phase"][];
  bodyweightOnly?: boolean;
  /** 默认 undefined=不限；Agent 场景传 true */
  featuredOnly?: boolean;
  limit?: number;
  search?: string;
}

const EXERCISE_SELECT =
  "id,slug,wger_id,name_en,name_zh,category,category_zh,movement_phase,intensity,muscles_primary,muscles_primary_zh,muscles_secondary,muscles_secondary_zh,equipment,equipment_zh,is_bodyweight,description_en,description_zh,image_url,image_thumbnail_url,source,license,license_url,license_author,attribution,source_url,is_active,is_featured,sort_order";

/** 展示名：中文优先，附英文原名 */
export function formatExerciseTitle(ex: Pick<Exercise, "name_zh" | "name_en">): string {
  if (!ex.name_zh || ex.name_zh === ex.name_en) return ex.name_en;
  return `${ex.name_zh}（${ex.name_en}）`;
}

/** 动作说明：优先中文，否则英文 */
export function resolveExerciseDescription(
  ex: Pick<Exercise, "description_zh" | "description_en">
): string {
  return (ex.description_zh || ex.description_en || "").trim();
}

/** CC 署短文案（详情页底部） */
export function formatExerciseAttribution(ex: Pick<Exercise, "attribution" | "license">): string {
  return ex.attribution || `动作数据来源遵循 ${ex.license}。`;
}

const GIF_OR_ANIM_RE = /\.(gif|webp)(\?|#|$)/i;

/** 优先动图（gif / 可能是动图的 webp），否则静图 */
export function resolveExerciseDemoUrl(
  ex: Pick<Exercise, "image_url" | "image_thumbnail_url">
): string | null {
  const candidates = [ex.image_url, ex.image_thumbnail_url].filter(
    (url): url is string => typeof url === "string" && url.trim().length > 0
  );
  const animated = candidates.find((url) => GIF_OR_ANIM_RE.test(url));
  return animated || candidates[0] || null;
}

export interface ExerciseMedia {
  id: string;
  image_url: string | null;
  image_thumbnail_url: string | null;
}

const MEDIA_SELECT = "id,image_url,image_thumbnail_url";

/** 按 id 取演示图（App 走 REST，避免 supabase-js） */
export async function fetchExerciseMediaByIds(
  ids: string[]
): Promise<Map<string, ExerciseMedia>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, ExerciseMedia>();
  if (!unique.length) return map;

  // #ifdef APP-PLUS
  const { ensureAccessToken, restSelect } = await import("@/api/supabase-rest");
  const accessToken = await ensureAccessToken();
  if (!accessToken) return map;
  const rows = await restSelect<ExerciseMedia[]>(
    "exercises",
    `id=in.(${unique.join(",")})&select=${MEDIA_SELECT}&is_active=eq.true`,
    accessToken
  );
  for (const row of rows || []) {
    map.set(row.id, row);
  }
  return map;
  // #endif

  // #ifdef H5
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("exercises")
    .select(MEDIA_SELECT)
    .in("id", unique)
    .eq("is_active", true);
  if (error) throw error;
  for (const row of (data || []) as ExerciseMedia[]) {
    map.set(row.id, row);
  }
  return map;
  // #endif

  return map;
}

/**
 * 按恢复分 readiness 映射可用强度
 * rest → 仅 light；light → light+moderate；train → 全部
 */
export function intensitiesForReadiness(
  readiness: "train" | "light" | "rest" | null | undefined
): Exercise["intensity"][] {
  if (readiness === "rest") return ["light"];
  if (readiness === "light") return ["light", "moderate"];
  return ["light", "moderate", "high"];
}

export async function listExercises(query: ExerciseQuery = {}): Promise<Exercise[]> {
  const supabase = getSupabase();
  let q = supabase
    .from("exercises")
    .select(EXERCISE_SELECT)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (query.category) q = q.eq("category", query.category);
  if (query.bodyweightOnly) q = q.eq("is_bodyweight", true);
  if (query.featuredOnly) q = q.eq("is_featured", true);

  if (query.intensity) {
    const list = Array.isArray(query.intensity) ? query.intensity : [query.intensity];
    q = q.in("intensity", list);
  }
  if (query.phase) {
    const list = Array.isArray(query.phase) ? query.phase : [query.phase];
    q = q.in("movement_phase", list);
  }
  if (query.search?.trim()) {
    const term = query.search.trim();
    q = q.or(`name_zh.ilike.%${term}%,name_en.ilike.%${term}%`);
  }
  if (query.limit && query.limit > 0) q = q.limit(query.limit);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Exercise[];
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("exercises")
    .select(EXERCISE_SELECT)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as Exercise) || null;
}

export async function getExercisesByIds(ids: string[]): Promise<Exercise[]> {
  if (!ids.length) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("exercises")
    .select(EXERCISE_SELECT)
    .in("id", ids)
    .eq("is_active", true);
  if (error) throw error;
  return (data || []) as Exercise[];
}

/**
 * 为今日计划抽样：热身 + 正式 + 拉伸
 * 默认只从 is_featured 精选子集取数（全库另用 listExercises / search）
 */
export async function pickPlanCandidates(options: {
  readiness?: "train" | "light" | "rest";
  bodyweightOnly?: boolean;
  mainCount?: number;
  featuredOnly?: boolean;
}): Promise<{ warmup: Exercise[]; main: Exercise[]; cooldown: Exercise[] }> {
  const intensities = intensitiesForReadiness(options.readiness);
  const mainCount = options.mainCount ?? 4;
  const featuredOnly = options.featuredOnly !== false;

  const [warmup, main, cooldown] = await Promise.all([
    listExercises({
      phase: ["warmup", "flexible"],
      intensity: intensities,
      bodyweightOnly: options.bodyweightOnly,
      featuredOnly,
      limit: 8,
    }),
    listExercises({
      phase: ["main", "flexible"],
      intensity: intensities,
      bodyweightOnly: options.bodyweightOnly,
      featuredOnly,
      limit: Math.max(mainCount * 3, 12),
    }),
    listExercises({
      phase: ["cooldown", "flexible"],
      intensity: ["light", "moderate"],
      bodyweightOnly: options.bodyweightOnly,
      featuredOnly,
      limit: 8,
    }),
  ]);

  return {
    warmup: warmup.slice(0, 2),
    main: main.slice(0, mainCount),
    cooldown: cooldown.slice(0, 2),
  };
}
