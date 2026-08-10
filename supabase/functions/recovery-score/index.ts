// supabase/functions/recovery-score/index.ts
// Deno Edge Function：计算每日恢复分（0-100）

interface HealthData {
    sleep_hours: number
    sleep_quality_score: number
    rest_days_consecutive: number
    steps: number
    mood: 'great' | 'good' | 'normal' | 'tired'
  }
  
  function calculateRecoveryScore(data: HealthData): {
    score: number
    breakdown: {
      sleep_score: number
      rest_score: number
      activity_score: number
      mood_score: number
    }
    recommendation: 'train' | 'light' | 'rest'
  } {
    const { sleep_hours, sleep_quality_score, rest_days_consecutive, steps, mood } = data
  
    // 1. 睡眠分数（权重 40%，满分 40）
    // 基准：7.5h = 100%，每少 1h 扣 15 分，每多 1h 加 5 分（上限 40）
    const sleepTarget = 7.5
    const sleepRatio = Math.min(1.3, Math.max(0, sleep_hours / sleepTarget))
    const sleepScore = Math.min(40, sleepRatio * 30 + (sleep_quality_score / 100) * 10)
  
    // 2. 休息日分数（权重 30%，满分 30）
    // 连续休息日每天 +10 分，封顶 30
    // 如果今天已运动，分数归 0
    const restScore = Math.min(30, rest_days_consecutive * 10)
  
    // 3. 活动量分数（权重 20%，满分 20）
    // 基准 8000 步 = 100%，每少 1000 步扣 2.5 分，上限 20
    const stepsRatio = Math.min(1.5, steps / 8000)
    const activityScore = Math.min(20, stepsRatio * 13.3)
  
    // 4. 心情分数（权重 10%，满分 10）
    const moodScores = { great: 10, good: 7.5, normal: 5, tired: 2.5 }
    const moodScore = moodScores[mood] || 5
  
    // 总分
    const score = Math.round(sleepScore + restScore + activityScore + moodScore)
  
    // 训练建议
    let recommendation: 'train' | 'light' | 'rest'
    if (score >= 80) {
      recommendation = 'train'
    } else if (score >= 50) {
      recommendation = 'light'
    } else {
      recommendation = 'rest'
    }
  
    return {
      score,
      breakdown: {
        sleep_score: Math.round(sleepScore * 10) / 10,
        rest_score: Math.round(restScore * 10) / 10,
        activity_score: Math.round(activityScore * 10) / 10,
        mood_score: Math.round(moodScore * 10) / 10,
      },
      recommendation,
    }
  }
  
  // Edge Function 入口
  Deno.serve(async (req) => {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }
  
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }
  
    try {
      const body = await req.json()
      const result = calculateRecoveryScore(body)
  
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  })
  