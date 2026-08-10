import { callEdgeFunction } from "@/api/edge";
import type { MemoryReadResult, QueryAgentResult } from "@/types/chat";
import { stripBriefDisclaimer } from "@/lib/health";
import type {
  MetricsDataSource,
  MorningBriefData,
  WorkoutReadiness,
} from "@/lib/health/types";

/** morning-brief Edge Function 返回结构 */
interface MorningBriefApiResponse {
  success: boolean;
  data?: {
    brief: string;
    recovery_score: number;
    workout_readiness: WorkoutReadiness;
    data_source?: MetricsDataSource;
    data_quality?: { quality_score?: number };
  };
  error?: string;
}

/**
 * Agent API 封装
 * 对接 query-agent 与 memory-working Edge Functions
 */
export const agentApi = {
  /** 生成/刷新晨间简报 */
  async getMorningBrief(userId: string): Promise<MorningBriefData> {
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
    };
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
