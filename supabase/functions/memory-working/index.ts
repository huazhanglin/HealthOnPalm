// supabase/functions/memory-working/index.ts
// Deno Edge Function：L1 Working Memory 管理

import { callSiliconFlowLLMWithFallback } from '../_shared/llm.ts'

interface Message {
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: string
  }
  
  const MAX_MESSAGES = 20  // 每会话最多保留 20 轮
  const SUMMARY_THRESHOLD = 12  // 超过12轮触发摘要
  
  async function getOrCreateConversation(supabase: any, userId: string, date: string) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single()
  
    if (error && error.code === 'PGRST116') {
      // 不存在，创建新的
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          date,
          messages: [],
          message_count: 0,
          tokens_used: 0,
        })
        .select()
        .single()
  
      if (createError) throw createError
      return newConv
    }
  
    if (error) throw error
    return data
  }
  
  function buildSimpleSummary(messages: Message[]): string {
    return messages
      .slice(-5)
      .map((m) => `${m.role}: ${m.content.slice(0, 60)}`)
      .join(' | ')
  }

  async function summarizeMessages(messages: Message[]): Promise<string> {
    const apiKey = Deno.env.get('SILICONFLOW_API_KEY') ?? ''
    const fallback = buildSimpleSummary(messages)

    if (!apiKey) {
      return fallback
    }

    const messagesText = messages.map(m => `${m.role}: ${m.content}`).join('\n')

    try {
      const result = await callSiliconFlowLLMWithFallback(
        apiKey,
        [
          {
            role: 'system',
            content: '你是记忆压缩专家。请将以下对话压缩为一段200字以内的摘要，保留关键信息和模式。',
          },
          { role: 'user', content: messagesText },
        ],
        { maxTokens: 200, temperature: 0 },
      )
      return result.content
    } catch (error) {
      console.warn('[memory-working] 摘要 LLM 失败，使用简单摘要:', error)
      return fallback
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
      const { user_id, action, message, conversation_id } = await req.json()
  
      if (!user_id || !action) {
        return new Response(JSON.stringify({ error: 'user_id and action are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
  
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = (await import('npm:@supabase/supabase-js@2.49.8')).createClient(supabaseUrl, supabaseKey)
  
      const today = new Date().toISOString().split('T')[0]
  
      if (action === 'read') {
        // 读取对话记录
        const conv = await getOrCreateConversation(supabase, user_id, today)
  
        if (conv.context_summary && conv.messages.length > SUMMARY_THRESHOLD) {
          // 有摘要时，只返回摘要 + 最近3轮
          const recentMessages = conv.messages.slice(-3)
          return new Response(JSON.stringify({
            success: true,
            context_summary: conv.context_summary,
            recent_messages: recentMessages,
            message_count: conv.message_count,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
  
        return new Response(JSON.stringify({
          success: true,
          messages: conv.messages,
          message_count: conv.message_count,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
  
      if (action === 'write') {
        // 写入消息
        const conv = await getOrCreateConversation(supabase, user_id, today)
        const newMessage: Message = {
          role: message.role,
          content: message.content,
          timestamp: new Date().toISOString(),
        }
  
        let messages = [...conv.messages, newMessage]
        let contextSummary = conv.context_summary
  
        // 超过阈值，触发摘要压缩
        if (messages.length > SUMMARY_THRESHOLD) {
          contextSummary = await summarizeMessages(messages.slice(0, -3))  // 不含最新消息
          messages = messages.slice(-5)  // 只保留最近5轮
        }
  
        // 截断（如果超过 MAX_MESSAGES）
        if (messages.length > MAX_MESSAGES) {
          messages = messages.slice(-MAX_MESSAGES)
        }
  
        const tokensUsed = message.content.length / 4  // 粗略估算
  
        await supabase
          .from('conversations')
          .update({
            messages,
            message_count: conv.message_count + 1,
            tokens_used: (conv.tokens_used || 0) + tokensUsed,
            context_summary: contextSummary,
          })
          .eq('id', conv.id)
  
        return new Response(JSON.stringify({
          success: true,
          message_count: conv.message_count + 1,
          context_summary: contextSummary,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
  
      return new Response(JSON.stringify({ error: 'Unknown action' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
  
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  })
  