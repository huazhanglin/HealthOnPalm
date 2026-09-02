// supabase/functions/workout-agent/index.ts
// Deno Edge Function：今日训练计划（精选动作库闭环）

import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import {
  fetchExerciseCandidates,
  formatExerciseCatalogForPrompt,
  type ExerciseRow,
} from "../_shared/exercises.ts";
import { callSiliconFlowLLMWithFallback } from "../_shared/llm.ts";
import { runSafetyCheck } from "../_shared/safety.ts";

const SILICONFLOW_API_KEY = Deno.env.get("SILICONFLOW_API_KEY") ?? "";

const WORKOUT_SYSTEM_PROMPT = `你是 Health on Palm（简称 HOP，中文名「掌握健康」）的专业健身教练。

你的职责：
- 根据用户的恢复分和偏好，从「候选动作清单」中选出今日训练
- 提供安全、可执行的一般性生活方式建议（非医疗）

硬性规则：
1. 只能从候选清单里选动作，必须原样使用清单中的 [id]
2. 恢复分 < 50 或 readiness=rest：只选 light / warmup / cooldown，禁止高强度主训
3. 恢复分 50-80 或 readiness=light：以 light/moderate 为主，主训动作不超过偏好时长的 70%
4. 恢复分 > 80 或 readiness=train：可正常强度，仍禁止编造动作
5. 每个动作必须给出组数，以及次数或时长二者之一，禁止同时填写。禁止给出具体公斤重量或负荷。
   - 重复类（深蹲、俯卧撑、鸟狗式、死虫、开合跳、平板肩触等动态动作）：sets + reps（如 "8-12"），duration_seconds 必须为 null
   - 静态维持（标准平板、侧平板、静蹲）与拉伸：sets + duration_seconds，reps 必须为 null。平板/侧平板 duration_seconds 不得低于 30
   - 热身 1 组；正式 2–4 组；拉伸 1 组按时长（20–40 秒）
6. 热身 1-2 个、正式 3-5 个、拉伸 1-2 个
7. 不要在结尾附加固定免责声明句
8. 只输出 JSON，不要 Markdown 代码块以外的解释

输出 JSON schema：
{
  "title": "今日计划短标题",
  "reason": "为什么今天适合这个安排（2-3句）",
  "duration_minutes": 30,
  "estimated_calories": 180,
  "warmup": [{"id":"uuid","tips":"要点一句","sets":1,"reps":"8-10","duration_seconds":null}],
  "main": [{"id":"uuid","tips":"要点一句","sets":3,"reps":"8-12","duration_seconds":null}],
  "cooldown": [{"id":"uuid","tips":"要点一句","sets":1,"reps":null,"duration_seconds":30}]
}`;

interface RequestBody {
  user_id: string;
  force_refresh?: boolean;
  bodyweight_only?: boolean;
}

type DosePhase = "warmup" | "main" | "cooldown";
type Readiness = "train" | "light" | "rest";

interface PlanItem {
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
  sets: number | null;
  reps: string | null;
  duration_seconds: number | null;
}

interface LlmPick {
  id?: string;
  tips?: string;
  sets?: unknown;
  reps?: unknown;
  duration_seconds?: unknown;
}

export interface WorkoutPlanPayload {
  version: 1;
  title: string;
  reason: string;
  duration_minutes: number;
  estimated_calories: number;
  recovery_score: number;
  workout_readiness: "train" | "light" | "rest";
  warmup: PlanItem[];
  main: PlanItem[];
  cooldown: PlanItem[];
  generated_by: "llm" | "template";
  generated_at: string;
  attribution_note: string;
}

function todayYmd(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

/** 避免冷启动后等 LLM 过久；超时则用模板计划 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(label));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function parseCachedPlan(raw: string | null | undefined): WorkoutPlanPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WorkoutPlanPayload;
    if (parsed?.version === 1 && Array.isArray(parsed.main)) {
      return ensurePlanDoses(parsed);
    }
  } catch {
    // ignore legacy text plans
  }
  return null;
}

function exerciseText(item: Pick<PlanItem, "name_zh" | "name_en" | "category_zh">): string {
  return `${item.name_zh} ${item.name_en} ${item.category_zh}`.toLowerCase();
}

function isDynamicPlankVariant(item: Pick<PlanItem, "name_en">): boolean {
  const en = (item.name_en || "").toLowerCase();
  if (!/plank/.test(en)) return false;
  return /tap|jack|reach|row|lift|extension|alternating|to /.test(en);
}

function looksTimedExercise(item: Pick<PlanItem, "name_zh" | "name_en" | "category_zh">): boolean {
  const text = exerciseText(item);
  if (/stretch|拉伸|伸展/.test(text)) return true;
  if (/wall sit|静蹲|靠墙坐/.test(text)) return true;
  if (isDynamicPlankVariant(item)) return false;
  return /(?:^|[\s(])plank|side plank|forearm plank|front plank|reverse plank|平板/.test(
    text,
  );
}

function isHoldExercise(item: Pick<PlanItem, "name_zh" | "name_en" | "category_zh">): boolean {
  const text = exerciseText(item);
  return /plank|平板|wall sit|静蹲|靠墙坐/.test(text) && !isDynamicPlankVariant(item);
}

function clampSets(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(6, Math.max(1, Math.round(n)));
}

function parseReps(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/[–—]/g, "-").replace(/次/g, "").trim();
  if (!s) return null;
  if (/^\d{1,2}(-\d{1,2})?$/.test(s)) return s;
  return null;
}

function clampDuration(raw: unknown, minSeconds = 20): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < minSeconds) return null;
  return Math.min(180, Math.round(n));
}

function minTimedSeconds(item: Pick<PlanItem, "name_zh" | "name_en" | "category_zh">, phase: DosePhase): number {
  if (phase === "cooldown") return 20;
  if (isHoldExercise(item)) return 30;
  return 20;
}

function defaultExerciseDose(
  phase: DosePhase,
  item: Pick<PlanItem, "name_zh" | "name_en" | "category_zh" | "intensity">,
  readiness: Readiness,
): Pick<PlanItem, "sets" | "reps" | "duration_seconds"> {
  const timed = phase === "cooldown" || looksTimedExercise(item);
  if (phase === "warmup") {
    if (timed) {
      return { sets: 1, reps: null, duration_seconds: isHoldExercise(item) ? 30 : 20 };
    }
    return { sets: 1, reps: "8-10", duration_seconds: null };
  }
  if (phase === "cooldown") {
    return { sets: 1, reps: null, duration_seconds: 30 };
  }
  if (timed) {
    return {
      sets: readiness === "train" ? 3 : 2,
      reps: null,
      duration_seconds: 30,
    };
  }
  if (readiness === "rest") return { sets: 2, reps: "8-10", duration_seconds: null };
  if (readiness === "light") return { sets: 2, reps: "10-12", duration_seconds: null };
  if (item.intensity === "high") return { sets: 3, reps: "6-10", duration_seconds: null };
  return { sets: 3, reps: "8-12", duration_seconds: null };
}

function resolveItemDose(
  item: PlanItem,
  phase: DosePhase,
  readiness: Readiness,
  pick?: LlmPick,
): PlanItem {
  const merged: PlanItem = {
    ...item,
    sets: clampSets(pick?.sets ?? item.sets),
    reps: parseReps(pick?.reps ?? item.reps),
    duration_seconds: clampDuration(pick?.duration_seconds ?? item.duration_seconds, 1),
  };
  const defaults = defaultExerciseDose(phase, item, readiness);
  const timed = phase === "cooldown" || looksTimedExercise(item);

  if (timed) {
    return {
      ...item,
      sets: clampSets(merged.sets) ?? defaults.sets,
      reps: null,
      duration_seconds:
        clampDuration(merged.duration_seconds, minTimedSeconds(item, phase)) ??
        defaults.duration_seconds,
    };
  }

  return {
    ...item,
    sets: clampSets(merged.sets) ?? defaults.sets,
    reps: parseReps(merged.reps) ?? defaults.reps,
    duration_seconds: null,
  };
}

function ensurePlanDoses(plan: WorkoutPlanPayload): WorkoutPlanPayload {
  const readiness = plan.workout_readiness;
  return {
    ...plan,
    warmup: plan.warmup.map((item) => resolveItemDose(item, "warmup", readiness)),
    main: plan.main.map((item) => resolveItemDose(item, "main", readiness)),
    cooldown: plan.cooldown.map((item) => resolveItemDose(item, "cooldown", readiness)),
  };
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1].trim() : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function enrichItems(
  picks: LlmPick[] | undefined,
  catalog: Map<string, ExerciseRow>,
  max: number,
  phase: DosePhase,
  readiness: Readiness,
): PlanItem[] {
  const out: PlanItem[] = [];
  for (const pick of picks || []) {
    if (out.length >= max) break;
    const id = String(pick?.id || "");
    const ex = catalog.get(id);
    if (!ex) continue;
    const base: PlanItem = {
      id: ex.id,
      tips: String(pick?.tips || "保持动作控制，不适即停。").slice(0, 80),
      name_zh: ex.name_zh,
      name_en: ex.name_en,
      category_zh: ex.category_zh,
      intensity: ex.intensity,
      movement_phase: ex.movement_phase,
      equipment_zh: ex.equipment_zh || [],
      muscles_primary_zh: ex.muscles_primary_zh || [],
      image_url: ex.image_url,
      attribution: ex.attribution,
      description: (ex.description_zh || ex.description_en || "").slice(0, 400),
      sets: null,
      reps: null,
      duration_seconds: null,
    };
    out.push(resolveItemDose(base, phase, readiness, pick));
  }
  return out;
}

function buildFallbackPlan(
  catalog: ExerciseRow[],
  readiness: "train" | "light" | "rest",
  recoveryScore: number,
  preferredDuration: number,
): WorkoutPlanPayload {
  const byPhase = {
    warmup: catalog.filter((e) =>
      e.movement_phase === "warmup" || e.movement_phase === "flexible"
    ),
    main: catalog.filter((e) =>
      e.movement_phase === "main" || e.movement_phase === "flexible"
    ),
    cooldown: catalog.filter((e) =>
      e.movement_phase === "cooldown" || e.movement_phase === "flexible"
    ),
  };

  const duration =
    readiness === "rest"
      ? Math.min(20, preferredDuration)
      : readiness === "light"
        ? Math.round(preferredDuration * 0.7)
        : preferredDuration;

  const take = (list: ExerciseRow[], n: number) => list.slice(0, n);
  const mapItems = (
    list: ExerciseRow[],
    tip: string,
    phase: DosePhase,
  ): PlanItem[] =>
    list.map((ex) =>
      resolveItemDose(
        {
          id: ex.id,
          tips: tip,
          name_zh: ex.name_zh,
          name_en: ex.name_en,
          category_zh: ex.category_zh,
          intensity: ex.intensity,
          movement_phase: ex.movement_phase,
          equipment_zh: ex.equipment_zh || [],
          muscles_primary_zh: ex.muscles_primary_zh || [],
          image_url: ex.image_url,
          attribution: ex.attribution,
          description: (ex.description_zh || ex.description_en || "").slice(0, 400),
          sets: null,
          reps: null,
          duration_seconds: null,
        },
        phase,
        readiness,
      )
    );

  const warmup = mapItems(
    take(byPhase.warmup, 2),
    "缓慢活动关节，逐步提高心率。",
    "warmup",
  );
  const mainCount = readiness === "rest" ? 2 : readiness === "light" ? 3 : 4;
  const main = mapItems(
    take(byPhase.main.length ? byPhase.main : catalog, mainCount),
    readiness === "rest" ? "轻松完成即可，不必追求强度。" : "动作标准优先，呼吸均匀。",
    "main",
  );
  const cooldown = mapItems(
    take(byPhase.cooldown, 2),
    "拉伸时不要弹振，感到牵拉即可。",
    "cooldown",
  );

  const title =
    readiness === "rest"
      ? "今日以恢复为主"
      : readiness === "light"
        ? "今日轻量活动计划"
        : "今日训练计划";

  const reason =
    readiness === "rest"
      ? `当前恢复分约 ${recoveryScore}，建议以拉伸与轻松活动为主，给身体留出恢复空间。`
      : readiness === "light"
        ? `恢复分约 ${recoveryScore}，适合中低强度活动，控制时长并关注身体反馈。`
        : `恢复分约 ${recoveryScore}，状态较好，可按偏好完成一组完整训练。`;

  return {
    version: 1,
    title,
    reason,
    duration_minutes: duration,
    estimated_calories: Math.round(duration * (readiness === "train" ? 7 : readiness === "light" ? 5 : 3)),
    recovery_score: recoveryScore,
    workout_readiness: readiness,
    warmup,
    main,
    cooldown,
    generated_by: "template",
    generated_at: new Date().toISOString(),
    attribution_note:
      "动作数据改编自 wger.de，遵循 CC BY-SA；详情页请保留署名。",
  };
}

function resolveReadiness(
  score: number | null | undefined,
  readiness: string | null | undefined,
): "train" | "light" | "rest" {
  if (readiness === "train" || readiness === "light" || readiness === "rest") {
    return readiness;
  }
  if (score == null) return "light";
  if (score >= 80) return "train";
  if (score >= 50) return "light";
  return "rest";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const body = (await req.json()) as RequestBody;
    const userId = body.user_id;
    if (!userId) {
      return jsonResponse({ success: false, error: "user_id is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const date = todayYmd();

    const { data: profile } = await supabase
      .from("users")
      .select(
        "id,nickname,age,gender,fitness_level,preferred_workout_time,workout_duration_preference,sleep_goal_hours",
      )
      .eq("id", userId)
      .maybeSingle();

    const { data: summary } = await supabase
      .from("daily_summaries")
      .select(
        "ai_plan,ai_recovery_score,ai_workout_readiness,steps,active_calories,exercise_minutes",
      )
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    if (!body.force_refresh) {
      const cached = parseCachedPlan(summary?.ai_plan);
      if (cached) {
        return jsonResponse({ success: true, data: cached, cached: true });
      }
    }

    const recoveryScore =
      summary?.ai_recovery_score != null
        ? Number(summary.ai_recovery_score)
        : 60;
    const readiness = resolveReadiness(
      recoveryScore,
      summary?.ai_workout_readiness,
    );
    const preferredDuration = Number(profile?.workout_duration_preference) || 30;

    const candidates = await fetchExerciseCandidates(supabase, {
      readiness,
      bodyweightOnly: Boolean(body.bodyweight_only),
      featuredOnly: true,
      limit: 40,
    });

    if (!candidates.length) {
      return jsonResponse({
        success: false,
        error: "动作库为空，请先同步 exercises",
      }, 503);
    }

    const catalogMap = new Map(candidates.map((c) => [c.id, c]));
    let plan = buildFallbackPlan(
      candidates,
      readiness,
      recoveryScore,
      preferredDuration,
    );
    let generatedBy: "llm" | "template" = "template";

    const userPrompt = `请为用户生成今日训练计划 JSON。

用户：
- 昵称：${profile?.nickname || "朋友"}
- 运动水平：${profile?.fitness_level || "beginner"}
- 偏好时长：${preferredDuration} 分钟
- 偏好时段：${profile?.preferred_workout_time || "flexible"}

今日状态：
- 恢复分：${recoveryScore}/100
- 训练建议档：${readiness}
- 步数：${summary?.steps ?? "未知"}
- 活动热量：${summary?.active_calories ?? "未知"}

候选动作清单（只能从中选择 id）：
${formatExerciseCatalogForPrompt(candidates)}
`;

    try {
      const llm = await withTimeout(
        callSiliconFlowLLMWithFallback(
          SILICONFLOW_API_KEY,
          [
            { role: "system", content: WORKOUT_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          { maxTokens: 1400, temperature: 0.5 },
        ),
        12_000,
        "llm-timeout",
      );
      const parsed = extractJsonObject(llm.content);
      if (parsed) {
        const warmup = enrichItems(
          parsed.warmup as LlmPick[],
          catalogMap,
          2,
          "warmup",
          readiness,
        );
        const main = enrichItems(
          parsed.main as LlmPick[],
          catalogMap,
          readiness === "rest" ? 3 : 5,
          "main",
          readiness,
        );
        const cooldown = enrichItems(
          parsed.cooldown as LlmPick[],
          catalogMap,
          2,
          "cooldown",
          readiness,
        );

        if (main.length >= 1) {
          const duration = Math.min(
            90,
            Math.max(
              10,
              Number(parsed.duration_minutes) || preferredDuration,
            ),
          );
          plan = {
            version: 1,
            title: String(parsed.title || plan.title).slice(0, 40),
            reason: String(parsed.reason || plan.reason).slice(0, 240),
            duration_minutes: duration,
            estimated_calories: Math.min(
              800,
              Math.max(
                40,
                Number(parsed.estimated_calories) ||
                  Math.round(duration * 5),
              ),
            ),
            recovery_score: recoveryScore,
            workout_readiness: readiness,
            warmup: warmup.length ? warmup : plan.warmup,
            main,
            cooldown: cooldown.length ? cooldown : plan.cooldown,
            generated_by: "llm",
            generated_at: new Date().toISOString(),
            attribution_note: plan.attribution_note,
          };
          generatedBy = "llm";
        }
      }
    } catch (error) {
      console.warn("[workout-agent] LLM failed, using template:", error);
    }

    const safetyText = `${plan.title}\n${plan.reason}\n${
      [...plan.warmup, ...plan.main, ...plan.cooldown].map((i) => i.tips).join("\n")
    }`;
    const safety = await runSafetyCheck(safetyText, {
      skipLlmCheck: true,
      apiKey: SILICONFLOW_API_KEY,
    });
    if (safety.action === "BLOCK" || safety.action === "REFER") {
      plan = buildFallbackPlan(
        candidates.filter((c) => c.intensity === "light"),
        "rest",
        recoveryScore,
        Math.min(20, preferredDuration),
      );
      plan.reason = safety.response || plan.reason;
      generatedBy = "template";
    }

    plan.generated_by = generatedBy;
    plan = ensurePlanDoses(plan);

    // 持久化到当日摘要，形成可复用缓存
    const upsertPayload = {
      user_id: userId,
      date,
      ai_plan: JSON.stringify(plan),
      ai_recovery_score: recoveryScore,
      ai_workout_readiness: readiness,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("daily_summaries")
      .upsert(upsertPayload, { onConflict: "user_id,date" });

    if (upsertError) {
      console.warn("[workout-agent] upsert ai_plan failed:", upsertError.message);
    }

    return jsonResponse({
      success: true,
      data: plan,
      cached: false,
      safety_passed: safety.safe,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[workout-agent]", message);
    return jsonResponse({ success: false, error: message }, 500);
  }
});
