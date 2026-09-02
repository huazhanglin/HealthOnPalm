// supabase/functions/query-agent/index.ts
// Deno Edge Function：健康问答 Agent

import { createClient } from 'npm:@supabase/supabase-js@2.49.8'
import { callSiliconFlowLLMWithFallback } from '../_shared/llm.ts'
import { runSafetyCheck } from '../_shared/safety.ts'

const SILICONFLOW_API_KEY = Deno.env.get('SILICONFLOW_API_KEY') ?? ''

interface AgentContext {
  user_id: string
  query: string
}

async function getUserContext(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  const { data: workouts } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(7)

  const { data: sleeps } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(3)

  return { profile, workouts: workouts || [], sleeps: sleeps || [] }
}

async function searchMemories(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: memories } = await supabase
    .from('health_memories')
    .select('content, memory_type, created_at')
    .eq('user_id', userId)
    .eq('memory_type', 'episodic')
    .eq('compressed', false)
    .order('created_at', { ascending: false })
    .limit(5)

  return memories || []
}

function buildSystemPrompt(): string {
  return `你是 Health on Palm（简称 HOP，中文名「掌握健康」），一位专业、温暖、简洁的个人健康教练。

你的职责：
- 回答用户关于运动、睡眠、疲劳、健康习惯的问题
- 提供一般性的健康建议（非医疗建议）
- 鼓励用户养成健康的生活习惯

回答规则（严格遵守）：
1. 绝对不提"诊断""治疗""处方""药物推荐"
2. 如果用户描述的症状持续或严重，建议就医
3. 回答简洁，3-5句话为主（趋势分析不超过200字）
4. 不要过度医疗化用户的普通疲劳或不适
5. 语气温暖，像朋友在给建议，不是医生在问诊
6. 如果不确定，直接说"我不确定"，不要编造
7. 不要在结尾附加固定免责声明句

禁止输出：
- 任何药品名/保健品名
- 任何医疗机构/医生的具体推荐
- 任何涉及精神健康的诊断性表述`
}

function buildUserPrompt(query: string, context: Awaited<ReturnType<typeof getUserContext>>, memories: Array<{ content: string; created_at: string }>): string {
  let prompt = `用户问题：${query}\n\n`
  const profile = context.profile

  if (profile) {
    prompt += `用户档案：
- ${profile.nickname || '用户'}，${profile.age || '?'}岁，${profile.gender === 'male' ? '男' : profile.gender === 'female' ? '女' : ''}
- 运动水平：${profile.fitness_level || '未知'}
- 睡眠目标：${profile.sleep_goal_hours || 7.5}小时/天\n\n`
  }

  if (context.workouts?.length > 0) {
    const lastWorkout = context.workouts[0]
    prompt += `最近运动：
- 最近一次：${lastWorkout.date}，${lastWorkout.workout_type || '未知'}，${lastWorkout.duration_minutes || '?'}分钟
- 过去7天运动次数：${context.workouts.length}次\n\n`
  }

  if (context.sleeps?.length > 0) {
    const avgSleep = context.sleeps.reduce((a: number, b: { total_sleep_hours?: number }) => a + (b.total_sleep_hours || 0), 0) / context.sleeps.length
    prompt += `最近睡眠：
- 平均睡眠：${avgSleep.toFixed(1)}小时
- 最近记录：${context.sleeps[0].date}\n\n`
  }

  if (memories.length > 0) {
    prompt += `相关历史记忆：
${memories.map((m) => `- ${m.created_at.split('T')[0]}：${m.content}`).join('\n')}\n\n`
  }

  prompt += `请根据以上信息，给出回答。`
  return prompt
}

function buildFallbackResponse(query: string, profile: { nickname?: string } | null): string {
  const name = profile?.nickname || '朋友'
  const topic = query.length > 24 ? `${query.slice(0, 24)}...` : query

  return `${name}，关于「${topic}」，AI 服务暂时不可用，我先给你一个通用建议：

- 保证 7-8 小时睡眠，今天适当补水
- 若涉及运动，优先选择低强度活动并注意身体反馈
- 若不适持续或加重，请及时咨询医生`
}

async function callLLM(systemPrompt: string, userPrompt: string): Promise<{ text: string; fallback: boolean }> {
  try {
    const result = await callSiliconFlowLLMWithFallback(
      SILICONFLOW_API_KEY,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 500, temperature: 0.7 },
    )
    return { text: result.content, fallback: false }
  } catch (error) {
    console.warn('[query-agent] LLM 调用失败:', error)
    return { text: '', fallback: true }
  }
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, query } = await req.json() as AgentContext

    if (!user_id || !query) {
      return new Response(JSON.stringify({ error: 'user_id and query are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Safety Agent：审查用户输入（症状/医疗类问题直接拦截）
    const inputSafety = await runSafetyCheck(query, {
      skipLlmCheck: true,
      apiKey: SILICONFLOW_API_KEY,
    })

    if (inputSafety.action === 'BLOCK' || inputSafety.action === 'REFER') {
      return new Response(JSON.stringify({
        success: true,
        response: inputSafety.response,
        safety_passed: inputSafety.safe,
        safety_action: inputSafety.action,
        safety_layer: inputSafety.layer,
        generated_by: 'safety_agent',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const context = await getUserContext(supabase, user_id)
    const memories = await searchMemories(supabase, user_id)

    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(query, context, memories)
    const llmResult = await callLLM(systemPrompt, userPrompt)

    const rawResponse = llmResult.fallback
      ? buildFallbackResponse(query, context.profile)
      : llmResult.text

    // 2. Safety Agent：审查 AI 输出（MVP 先用规则引擎，节省 Token）
    const outputSafety = await runSafetyCheck(rawResponse, {
      skipLlmCheck: true,
      apiKey: SILICONFLOW_API_KEY,
      userContext: query,
    })

    return new Response(JSON.stringify({
      success: true,
      response: outputSafety.response,
      safety_passed: outputSafety.safe,
      safety_action: outputSafety.action,
      safety_layer: outputSafety.layer,
      generated_by: llmResult.fallback ? 'template' : 'llm',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
