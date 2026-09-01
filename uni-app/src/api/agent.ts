import { callEdgeFunction } from "@/api/edge";
import type { MemoryReadResult, QueryAgentResult } from "@/types/chat";
import { stripBriefDisclaimer } from "@/lib/health";
import type {
  MetricsDataSource,
  MorningBriefData,
  WorkoutReadiness,
} from "@/lib/health/types";
import { ensureWorkoutPlanDoses, type WorkoutPlan } from "@/lib/health/workout-plan";

/** morning-brief Edge Function 返回结构 */
interface MorningBriefApiResponse {
  success: boolean;
  data?: {
    brief: string;
    recovery_score: number;
    workout_readiness: WorkoutReadiness;
    sleep_missing?: boolean;
    data_source?: MetricsDataSource;
    data_quality?: { quality_score?: number; has_sleep?: boolean };
  };
  error?: string;
}

interface WorkoutPlanApiResponse {
  success: boolean;
  data?: WorkoutPlan;
  cached?: boolean;
  error?: string;
}

/**
 * Agent API 封装
 * 对接 query-agent / morning-brief / workout-agent / memory-working
 */
export const agentApi = {
  /** 生成/刷新晨间简报（生成前强制同步最新 HealthKit） */
  async getMorningBrief(userId: string): Promise<MorningBriefData> {
    try {
      const { ensureTodaySynced } = await import("@/lib/healthkit");
      await ensureTodaySynced({ force: true });
    } catch (error) {
      console.warn("[agent] 晨报前 HealthKit 同步失败，继续用已有云端数据:", error);
    }

    const result = await callEdgeFunction<MorningBriefApiResponse>("morning-brief", {
      user_id: userId,
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || "生成简报失败");
    }

    return {
      brief: stripBriefDisclaimer(result.data.brief),
      recoveryScore: result.data.recovery_score,
      workoutReadiness: result.data.workout_readiness,
      feedback: null,
      feedbackNote: null,
      dataSource: result.data.data_source ?? null,
      qualityScore: result.data.data_quality?.quality_score ?? null,
      sleepMissing:
        typeof result.data.sleep_missing === "boolean"
          ? result.data.sleep_missing
          : result.data.data_quality?.has_sleep === false,
    };
  },

  /** 今日训练计划（精选动作库闭环） */
  async getWorkoutPlan(
    userId: string,
    options: { forceRefresh?: boolean; bodyweightOnly?: boolean } = {}
  ): Promise<WorkoutPlan> {
    const result = await callEdgeFunction<WorkoutPlanApiResponse>("workout-agent", {
      user_id: userId,
      force_refresh: Boolean(options.forceRefresh),
      bodyweight_only: Boolean(options.bodyweightOnly),
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || "生成训练计划失败");
    }
    return ensureWorkoutPlanDoses(result.data);
  },

  /** 健康问答 */
  async askQuestion(userId: string, query: string): Promise<string> {
    const result = await callEdgeFunction<QueryAgentResult>("query-agent", {
      user_id: userId,
      query,
    });
    return stripBriefDisclaimer(result.response);
  },

  /** 写入 Working Memory */
  async writeMemory(
    userId: string,
    message: { role: string; content: string }
  ): Promise<void> {
    await callEdgeFunction("memory-working", {
      user_id: userId,
      action: "write",
      message,
    });
  },

  /** 读取 Working Memory（conversations 表） */
  async readMemory(userId: string): Promise<MemoryReadResult> {
    return callEdgeFunction<MemoryReadResult>("memory-working", {
      user_id: userId,
      action: "read",
    });
  },
};
