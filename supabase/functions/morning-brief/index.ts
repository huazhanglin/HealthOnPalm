// supabase/functions/morning-brief/index.ts
// Deno Edge Function：生成晨间简报

import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import {
  assessDataQuality,
  buildLowQualityPromptNote,
  mergeHealthData,
  type BriefHealthData,
  type DataQuality,
  type HealthDataSource,
} from "../_shared/data-quality.ts";
import { callSiliconFlowLLMWithFallback } from "../_shared/llm.ts";
import { runSafetyCheck } from "../_shared/safety.ts";

// ============ 配置 ============
const SILICONFLOW_API_KEY = Deno.env.get("SILICONFLOW_API_KEY") ?? "";
const DEFAULT_LLM_MODEL = "deepseek-ai/DeepSeek-V3.2";

// ============ 类型定义 ============
interface UserProfile {
  id: string;
  nickname: string;
  age: number;
  gender: string;
  fitness_level: string;
  preferred_workout_time: string;
  workout_duration_preference: number;
  sleep_goal_hours: number;
}

type HealthData = BriefHealthData;

interface RecoveryResult {
  score: number;
  recommendation: "train" | "light" | "rest";
  breakdown: {
    sleep_score: number;
    rest_score: number;
    activity_score: number;
    mood_score: number;
  };
}

// ============ LLM 调用 ============
const BRIEF_SYSTEM_PROMPT = `你是 Health On Palm（简称 HOP），一位专业、温暖、简洁的个人健康教练。
你的特点：
- 简洁直接，不啰嗦
- 语言像朋友在说，不像医生
- 每天只给一个重点行动建议（不多贪）
- 不要在结尾附加固定免责声明句

禁止：
- 不提诊断、治疗、处方、药物推荐
- 不给具体重量/组数/次数建议
- 不制造焦虑`;

async function callLLM(
  prompt: string,
  maxTokens = 800
): Promise<{ text: string; model: string; fallback: boolean }> {
  try {
    const result = await callSiliconFlowLLMWithFallback(
      SILICONFLOW_API_KEY,
      [
        { role: "system", content: BRIEF_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      { maxTokens, temperature: 0.7 }
    );
    return { text: result.content, model: result.model, fallback: false };
  } catch (error) {
    console.warn("[morning-brief] LLM 调用失败，使用模板兜底:", error);
    return { text: "", model: DEFAULT_LLM_MODEL, fallback: true };
  }
}

/** LLM 不可用时的模板简报（保证页面可展示） */
function buildFallbackBrief(
  profile: UserProfile,
  healthData: HealthData,
  recovery: RecoveryResult,
  quality: DataQuality
): string {
  const name = profile.nickname || "朋友";
  const emoji = recovery.score >= 80 ? "💪" : recovery.score >= 50 ? "☀️" : "😴";
  const keyword =
    recovery.recommendation === "train"
      ? "活力"
      : recovery.recommendation === "light"
        ? "平衡"
        : "恢复";

  const action =
    recovery.recommendation === "train"
      ? "今天适合安排一次中等强度运动，运动前做好热身，结束后记得拉伸。"
      : recovery.recommendation === "light"
        ? "今天适合轻度活动，比如 20 分钟散步或简单拉伸，避免高强度训练。"
        : "今天建议以休息为主，优先保证睡眠和补水，给身体充分恢复时间。";

  const qualityNote =
    quality.quality_score < 75
      ? "\n\n（今日部分健康数据未完整同步，建议仅供参考。）"
      : "";

  return `${emoji} 早安，${name}！今日关键词：${keyword}。

${action}

昨夜睡眠 ${healthData.sleep.total_hours} 小时，步数 ${healthData.steps.toLocaleString()} 步，恢复分 ${recovery.score}/100。${qualityNote}`;
}

// ============ 恢复分计算 ============
async function calculateRecovery(
  userId: string,
  healthData: HealthData
): Promise<RecoveryResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const res = await fetch(`${supabaseUrl}/functions/v1/recovery-score`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
    },
    body: JSON.stringify({
      sleep_hours: healthData.sleep.total_hours,
      sleep_quality_score: healthData.sleep.sleep_quality_score,
      rest_days_consecutive: 0,
      steps: healthData.steps,
      mood: healthData.mood,
    }),
  });

  const result = await res.json();
  if (!res.ok || result.error) {
    throw new Error(result.error || `recovery-score 调用失败 (${res.status})`);
  }
  return result;
}

// ============ 生成晨间简报 Prompt ============
function buildBriefPrompt(
  profile: UserProfile,
  healthData: HealthData,
  recovery: RecoveryResult,
  quality: DataQuality
): string {
  const recoveryEmoji =
    recovery.score >= 80 ? "💪" : recovery.score >= 50 ? "☀️" : "😴";
  const workoutText =
    recovery.recommendation === "train"
      ? "今天适合运动"
      : recovery.recommendation === "light"
        ? "今天适合轻度活动"
        : "今天建议以休息为主";

  let prompt = `用户信息：
- 姓名：${profile.nickname || "朋友"}
- 年龄：${profile.age || "未知"}岁
- 性别：${profile.gender === "male" ? "男" : profile.gender === "female" ? "女" : "其他"}
- 运动水平：${profile.fitness_level === "beginner" ? "初级" : profile.fitness_level === "interner" ? "中级" : "高级"}
- 偏好训练时间：${profile.preferred_workout_time}
- 睡眠目标：${profile.sleep_goal_hours}小时

昨日数据：
- 步数：${healthData.steps.toLocaleString()}步
- 活动卡路里：${healthData.active_calories}千卡
- 站立小时：${healthData.stand_hours}小时
- 睡眠：${healthData.sleep.total_hours}小时（深睡${healthData.sleep.deep_sleep_hours}h）
- 睡眠质量评分：${healthData.sleep.sleep_quality_score}/100
- 夜间醒来：${healthData.sleep.wake_ups}次
- 静息心率：${healthData.heart_rate.resting}bpm
- 今天已运动：${healthData.workout_done ? "是" : "否"}
- 今日心情：${healthData.mood}

恢复分析：
${recoveryEmoji} 恢复分：${recovery.score}/100（睡眠${recovery.breakdown.sleep_score} + 活动${recovery.breakdown.activity_score} + 心情${recovery.breakdown.mood_score}）
${workoutText}

请生成一段晨间简报：
1. 一句温暖问候 + 今日关键词（emoji + 一个词）
2. 今日行动建议（只给一个重点，不贪多）
3. 个性化理由（为什么今天适合/不适合运动，1-2句话）
4. 一个可立刻执行的具体操作建议

语言风格：简洁温暖，像朋友在说，不啰嗦。最多150字。`;

  prompt += buildLowQualityPromptNote(quality);
  return prompt;
}

function getTodayDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function fetchMockHealthData(
  userId: string,
  profile: UserProfile
): Promise<HealthData> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const mockResponse = await fetch(`${supabaseUrl}/functions/v1/mock-health-data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
    },
    body: JSON.stringify({
      user_id: userId,
      fitness_level: profile.fitness_level || "beginner",
      sleep_goal_hours: profile.sleep_goal_hours || 7.5,
    }),
  });
  const mockResult = await mockResponse.json();
  if (!mockResponse.ok || !mockResult.success || !mockResult.data) {
    throw new Error(
      mockResult.error || `mock-health-data 调用失败 (${mockResponse.status})`
    );
  }
  return mockResult.data as HealthData;
}

/** T9：评估质量 → 真实字段优先，缺失用 Mock 补齐 */
async function resolveHealthDataForBrief(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  profile: UserProfile,
  today: string
): Promise<{
  healthData: HealthData;
  quality: DataQuality;
  source: HealthDataSource;
  preserveMetrics: boolean;
}> {
  const quality = await assessDataQuality(supabase, userId, today);

  const [{ data: summary }, { data: sleep }] = await Promise.all([
    supabase
      .from("daily_summaries")
      .select(
        "steps, active_calories, stand_hours, resting_heart_rate, avg_heart_rate, has_workout, source"
      )
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("sleep_logs")
      .select(
        "total_sleep_hours, deep_sleep_hours, light_sleep_hours, rem_sleep_hours, wake_ups, sleep_quality_score, source"
      )
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle(),
  ]);

  const mock = await fetchMockHealthData(userId, profile);

  const realPartial: Partial<HealthData> = {
    steps: summary?.steps ?? undefined,
    active_calories: summary?.active_calories ?? undefined,
    stand_hours: summary?.stand_hours ?? undefined,
    sleep: sleep
      ? {
          total_hours: sleep.total_sleep_hours ?? 0,
          deep_sleep_hours: sleep.deep_sleep_hours ?? 0,
          light_sleep_hours: sleep.light_sleep_hours ?? 0,
          rem_sleep_hours: sleep.rem_sleep_hours ?? 0,
          wake_ups: sleep.wake_ups ?? 0,
          sleep_quality_score: sleep.sleep_quality_score ?? 70,
        }
      : undefined,
    heart_rate: {
      resting: summary?.resting_heart_rate ?? mock.heart_rate.resting,
      avg: summary?.avg_heart_rate ?? mock.heart_rate.avg,
      max: mock.heart_rate.max,
    },
    mood: "normal",
    workout_done: !!summary?.has_workout,
  };

  const merged = mergeHealthData(realPartial, mock, quality);

  const preserveMetrics =
    summary?.source === "healthkit" ||
    (quality.has_successful_sync && quality.has_steps);

  return {
    ...merged,
    preserveMetrics,
  };
}

async function saveDailySummary(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  healthData: HealthData,
  recovery: RecoveryResult,
  briefText: string,
  workoutReadiness: string,
  options: {
    today: string;
    preserveMetrics: boolean;
    dataSource: HealthDataSource;
    quality: DataQuality;
  }
) {
  const { today, preserveMetrics, dataSource, quality } = options;
  const aiFields = {
    ai_brief: briefText,
    ai_recovery_score: recovery.score,
    ai_workout_readiness: workoutReadiness,
    context_snapshot: {
      health_data: healthData,
      recovery,
      data_source: dataSource,
      data_quality: quality,
      generated_at: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };

  if (preserveMetrics) {
    const { data: updated, error } = await supabase
      .from("daily_summaries")
      .update(aiFields)
      .eq("user_id", userId)
      .eq("date", today)
      .select("id");

    if (error) {
      console.error("保存每日摘要失败:", error);
      throw error;
    }
    if (updated && updated.length > 0) {
      return;
    }
  }

  // hybrid 有真实同步痕迹时标记 healthkit，避免下次被当纯 mock 覆盖
  const sourceColumn =
    dataSource === "mock" ? "mock" : "healthkit";

  const { error } = await supabase.from("daily_summaries").upsert(
    {
      user_id: userId,
      date: today,
      steps: healthData.steps,
      active_calories: healthData.active_calories,
      stand_hours: healthData.stand_hours,
      source: sourceColumn,
      ...aiFields,
    },
    { onConflict: "user_id,date" }
  );

  if (error) {
    console.error("保存每日摘要失败:", error);
    throw error;
  }
}

// ============ 主入口 ============
Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "用户不存在" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = getTodayDateString();

    const { healthData, quality, source, preserveMetrics } =
      await resolveHealthDataForBrief(
        supabase,
        user_id,
        profile as UserProfile,
        today
      );

    const recovery = await calculateRecovery(user_id, healthData);
    if (recovery.score == null || !recovery.recommendation) {
      throw new Error("recovery-score 返回数据不完整");
    }

    const prompt = buildBriefPrompt(profile, healthData, recovery, quality);
    const llmResult = await callLLM(prompt);
    const briefText = llmResult.fallback
      ? buildFallbackBrief(profile, healthData, recovery, quality)
      : llmResult.text;
    const usedModel = llmResult.fallback ? "template-fallback" : llmResult.model;

    const briefSafety = await runSafetyCheck(briefText, {
      skipLlmCheck: true,
      apiKey: SILICONFLOW_API_KEY,
    });
    const safeText = briefSafety.response;

    await saveDailySummary(
      supabase,
      user_id,
      healthData,
      recovery,
      safeText,
      recovery.recommendation,
      { today, preserveMetrics, dataSource: source, quality }
    );

    await supabase.from("token_usage_logs").insert({
      user_id,
      model: usedModel,
      tokens_in: Math.floor(prompt.length / 4),
      tokens_out: Math.floor(safeText.length / 4),
      cost: llmResult.fallback
        ? 0
        : prompt.length / 4 / 1_000_000 * 0.5 + safeText.length / 4 / 1_000_000 * 1.5,
      request_type: "morning_brief",
      success: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          brief: safeText,
          recovery_score: recovery.score,
          workout_readiness: recovery.recommendation,
          health_data: healthData,
          data_source: source,
          data_quality: quality,
          generated_by: llmResult.fallback ? "template" : "llm",
          safety_action: briefSafety.action,
          safety_passed: briefSafety.safe,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Morning Brief 生成失败:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
