// src/api/agent.ts
import { supabase } from './supabase'
import { useUserStore } from '@/stores/user'

export interface MorningBriefResult {
  brief: string
  recovery_score: number
  workout_readiness: 'train' | 'light' | 'rest'
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

class AgentAPI {
  private baseUrl: string

  constructor() {
    this.baseUrl = import.meta.env.VITE_SUPABASE_URL
  }

  private async call<T>(endpoint: string, params: Record<string, any>): Promise<T> {
    const userStore = useUserStore()
    if (!userStore.user?.id) {
      throw new Error('用户未登录')
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('未登录')
    }

    const response = await fetch(`${this.baseUrl}/functions/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '请求失败')
    }

    const result = await response.json()
    return result
  }

  // 晨间简报
  async getMorningBrief(userId: string): Promise<MorningBriefResult> {
    const result = await this.call<any>('morning-brief', { user_id: userId })
    return {
      brief: result.data.brief,
      recovery_score: result.data.recovery_score,
      workout_readiness: result.data.workout_readiness,
    }
  }

  // 健康问答
  async askQuestion(userId: string, query: string): Promise<string> {
    const result = await this.call<any>('query-agent', { user_id: userId, query })
    return result.response
  }

  // 训练建议
  async getWorkoutSuggestion(userId: string): Promise<string> {
    const result = await this.call<any>('workout-agent', { user_id: userId })
    return result.response
  }

  // 安全检查
  async safetyCheck(text: string): Promise<{ safe: boolean; response: string }> {
    const result = await this.call<any>('safety-check', {
      text,
      skip_llm_check: true,  // MVP 节省 Token
    })
    return { safe: result.safe, response: result.response }
  }

  // 写入 Working Memory
  async writeMemory(userId: string, message: { role: string; content: string }): Promise<void> {
    await this.call('memory-working', {
      user_id: userId,
      action: 'write',
      message,
    })
  }

  // 读取 Working Memory
  async readMemory(userId: string): Promise<any> {
    return await this.call('memory-working', {
      user_id: userId,
      action: 'read',
    })
  }
}

export const agentApi = new AgentAPI()
