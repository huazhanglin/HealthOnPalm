// supabase/functions/memory-episodic/index.ts
// Deno Edge Function：L2 Episodic Memory 管理

async function getEmbedding(text: string): Promise<number[]> {
    const SILICONFLOW_API_KEY = Deno.env.get('SILICONFLOW_API_KEY')!
  
    const response = await fetch('https://api.siliconflow.cn/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'BAAI/bge-m3',
        input: text,
      }),
    })
  
    const data = await response.json()
    return data.data?.[0]?.embedding || []
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
      const { user_id, action, content, memory_source, source_id, extracted_entities, importance_score } = await req.json()
  
      if (!user_id || !action) {
        return new Response(JSON.stringify({ error: 'user_id and action are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
  
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = (await import('npm:@supabase/supabase-js@2.49.8')).createClient(supabaseUrl, supabaseKey)
  
      if (action === 'write') {
        if (!content) {
          return new Response(JSON.stringify({ error: 'content is required for write action' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
  
        // 生成 embedding
        const embedding = await getEmbedding(content)
  
        // 写入数据库
        const { error } = await supabase
          .from('health_memories')
          .insert({
            user_id,
            memory_type: 'episodic',
            content,
            content_embedding: embedding,
            memory_source: memory_source || 'conversation',
            source_id,
            extracted_entities: extracted_entities || {},
            importance_score: importance_score || 5.0,
            expires_at: new Date(Date.now() + 180 * 24 * 3600000).toISOString(),  // 180天后过期
          })
  
        if (error) throw error
  
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
  
      if (action === 'search') {
        if (!content) {
          return new Response(JSON.stringify({ error: 'content is required for search action' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
  
        // 生成查询向量
        const queryEmbedding = await getEmbedding(content)
  
        // 相似度搜索（pgvector）
        const { data, error } = await supabase
          .rpc('match_health_memories', {
            query_embedding: queryEmbedding,
            match_threshold: 0.7,
            match_count: 5,
            user_id_param: user_id,
          })
  
        if (error) {
          // 如果 RPC 不存在，降级到简单查询
          const { data: fallback } = await supabase
            .from('health_memories')
            .select('content, memory_source, created_at')
            .eq('user_id', user_id)
            .eq('memory_type', 'episodic')
            .eq('compressed', false)
            .order('created_at', { ascending: false })
            .limit(5)
  
          return new Response(JSON.stringify({
            success: true,
            memories: fallback || [],
            fallback: true,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
  
        return new Response(JSON.stringify({
          success: true,
          memories: data || [],
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
  