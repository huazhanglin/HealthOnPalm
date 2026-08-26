# Health On Palm (HOP) MVP — W2 详细执行计划

> **阶段目标**：Morning Brief Agent 核心闭环跑通 + Mock 数据驱动 + AI 对话入口  
> **时间范围**：Day 8 - Day 14（2026-07-28 至 2026-08-03）  
> **前置依赖**：W1 全部完成（Supabase + Auth + 基础页面）  
> **验收标准**：用户打开 App，能看到 AI 生成的今日晨间简报 + 能与 AI 对话获取健康建议  
> **日均投入**：2-4 小时（OPC 模式）  
> **文档状态**：2026-08-24 已按**当前运行**修订；逐步任务正文多为当时施工稿，与现行差异见下节。

---

## 📋 实际运行对照（2026-08-24）

W2 把「Mock 晨报 + 多 Agent + 对话页」做进了 iOS App，**这一条已在真机上跑通**。下列计划项与现行不一致：

| 计划 / 原文 | 实际运行 |
|-------------|----------|
| 登录仍写手机号 OTP | **邮箱 + 密码**（W3 切换，现行唯一） |
| Workout Agent | W2 为**文案级训练建议**；**可执行动作清单 + 打卡闭环在 W4** |
| Recovery Score | W2 已有计算；**缺睡眠中性分、休息平衡、心情进分在 W4 重做** |
| T7.1 定时任务 / 晨间推送 | **未作为产品路径**：用户打开首页再生成/读取简报，无微信服务通知 |
| 对话界面「类似微信」 | 独立聊天页；**语音输入/播报是 W3 加的** |
| 下文 SiliconFlow「手机号验证码注册」 | 仅指硅基流动控制台，与 App 登录无关 |
| Edge 部署 | 已部署到 `zewznptbyhurxaqirzmb`：`morning-brief`、`query-agent`、`safety-check`、`memory-*`、`recovery-score`、`mock-health-data`、`workout-agent` 等 |

**W2 实际交付（仍有效）：** Mock 健康数据、晨报生成与入库、Safety、Memory L1/L2、Query Agent、对话页骨架、首页晨报卡片。

后续：HealthKit 在 **W3**；训练闭环 / 心情 / 自动同步在 **W4**（`doc/W4 详细执行记录_产品闭环与体验增强.md`）。

---

## 📋 W1 回顾与 W2 起点确认

### W1 已完成清单

| 模块 | 状态 | W2 依赖说明 |
|------|------|-----------|
| Supabase 项目 + Schema | ✅ | 直接使用 |
| RLS 安全策略 | ✅ | 直接使用 |
| 用户登录/注册 | ✅ | **现行邮箱密码**（非计划中的微信/OTP） |
| 用户档案页面 + 新手引导 | ✅ | 直接使用 |
| API 封装 + 类型定义 | ✅ | W2 的 API 基于此扩展 |
| UI 组件库 + 样式规范 | ✅ | 直接使用 |
| uni-app 项目初始化 | ✅ | `uni-app/` |

### W2 需要新增的模块

```
W2 新增模块：
├── T1  Mock 数据服务（健康数据模拟）     ✅
├── T2  Recovery Score 计算逻辑          ✅（W4 再改规则）
├── T3  Morning Brief Agent              ✅
├── T4  Query Agent                      ✅
├── T5  Workout Agent                    ✅ 文案建议；闭环见 W4
├── T6  Safety Agent                     ✅
├── T7  Memory Agent（记忆读写）          ✅
├── T8  AI 对话界面开发                  ✅（语音见 W3）
├── T9  Supabase Edge Functions 部署     ✅
├── T10 定时任务（每日晨间推送）          ❌ 未做（打开 App 再生成）
└── T11 集成测试 + W2 里程碑验收          ✅ 主路径
```

---

## 📋 W2 任务总览

| 任务编号 | 任务名称 | 优先级 | 预计耗时 | 实际状态 |
|---------|---------|-------|---------|----------|
| W2-T1 | Mock 数据服务 | P0 | 2h | ✅ |
| W2-T2 | Recovery Score 计算 | P0 | 3h | ✅（规则 W4 再改） |
| W2-T3 | Supabase Edge Functions 初始化 | P0 | 2h | ✅ |
| W2-T4 | Morning Brief Agent | P0 | 8h | ✅ |
| W2-T5 | Safety Agent | P0 | 4h | ✅ |
| W2-T6 | Memory Agent（L1 + L2） | P1 | 4h | ✅ |
| W2-T7 | Query Agent | P1 | 4h | ✅ |
| W2-T8 | Workout Agent | P1 | 4h | ✅ 文案建议；打卡闭环 W4 |
| W2-T9 | AI 对话界面 | P1 | 4h | ✅ 文字；语音 W3 |
| W2-T10 | 定时任务 + 推送 | P2 | 3h | ❌ **未做** |
| W2-T11 | 集成测试 + Bug 修复 | P0 | 5h | ✅ 主路径 |
| **总计** | | | **43h** | |

---

## 📅 Day 8（2026-07-28 周一）

### 目标
Mock 数据服务 + Recovery Score 计算 + Edge Functions 初始化

> ⚠️ **数据库 Schema 更新（W2 必须）**
> W1 创建的 `health_memories.content_embedding` 是 `VECTOR(1024)`，但 SiliconFlow 的 `BAAI/bge-m3` Embedding 输出 **1024 维**。
> 需要在 Supabase SQL Editor 执行以下 ALTER（完整说明见 Day 10 的 `match_health_memories` RPC 之后）：
> ```sql
> ALTER TABLE public.health_memories
>   ALTER COLUMN content_embedding TYPE VECTOR(1024);
> ```

---

### ✅ T2.1 Mock 数据服务（2h）

**目标：** 生成模拟健康数据，让 AI 在没有真实 HealthKit 数据时也能跑通

**新建文件：** `supabase/functions/mock-health-data/index.ts`

```typescript
// supabase/functions/mock-health-data/index.ts
// Deno Edge Function：生成模拟健康数据

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MockDataOptions {
  user_id: string
  fitness_level: 'beginner' | 'intermediate' | 'advanced'
  sleep_goal_hours: number
}

function generateMockData(options: MockDataOptions) {
  const { fitness_level, sleep_goal_hours } = options

  // 步数（根据运动水平浮动）
  const baseSteps = {
    beginner: () => Math.floor(Math.random() * 4000) + 3000,   // 3000-7000
    intermediate: () => Math.floor(Math.random() * 6000) + 5000, // 5000-11000
    advanced: () => Math.floor(Math.random() * 8000) + 8000,  // 8000-16000
  }

  // 睡眠（围绕目标浮动）
  const actualSleep = sleep_goal_hours + (Math.random() * 3 - 1.5) // ±1.5h 浮动
  const deepSleepRatio = 0.15 + Math.random() * 0.1  // 15%-25%
  const remSleepRatio = 0.20 + Math.random() * 0.1   // 20%-30%

  // 睡眠质量评分（根据实际/目标的比率）
  const sleepQualityScore = Math.min(100, Math.max(0,
    (actualSleep / sleep_goal_hours) * 70 + Math.random() * 30
  ))

  // 活动卡路里
  const activeCalories = Math.floor(Math.random() * 400) + 150

  // 站立小时数
  const standHours = Math.floor(Math.random() * 5) + 4

  // 静息心率（根据运动水平）
  const restingHeartRate = {
    beginner: Math.floor(Math.random() * 15) + 65,   // 65-80
    intermediate: Math.floor(Math.random() * 10) + 58, // 58-68
    advanced: Math.floor(Math.random() * 10) + 52,   // 52-62
  }

  // 主观心情（从用户历史推测，或随机）
  const moods = ['great', 'good', 'normal', 'tired'] as const
  const moodWeights = [0.1, 0.35, 0.35, 0.2]  // 概率分布
  const randomMood = () => {
    const r = Math.random()
    let cumsum = 0
    for (let i = 0; i < moods.length; i++) {
      cumsum += moodWeights[i]
      if (r <= cumsum) return moods[i]
    }
    return 'normal'
  }

  return {
    date: new Date().toISOString().split('T')[0],
    steps: baseSteps[fitness_level](),
    active_calories: activeCalories,
    stand_hours: parseFloat(standHours.toFixed(1)),
    sleep: {
      total_hours: parseFloat(actualSleep.toFixed(1)),
      deep_sleep_hours: parseFloat((actualSleep * deepSleepRatio).toFixed(1)),
      light_sleep_hours: parseFloat((actualSleep * (1 - deepSleepRatio - remSleepRatio)).toFixed(1)),
      rem_sleep_hours: parseFloat((actualSleep * remSleepRatio).toFixed(1)),
      wake_ups: Math.floor(Math.random() * 4),
      sleep_quality_score: parseFloat(sleepQualityScore.toFixed(1)),
      sleep_start: new Date(Date.now() - actualSleep * 3600000 - Math.random() * 3600000).toISOString(),
      sleep_end: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    },
    heart_rate: {
      resting: restingHeartRate[fitness_level],
      avg: restingHeartRate[fitness_level] + Math.floor(Math.random() * 20),
      max: Math.floor(Math.random() * 40) + 140,
    },
    mood: randomMood(),
    workout_done: Math.random() > 0.6,  // 40% 概率今天已运动
  }
}

Deno.serve(async (req) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, fitness_level = 'beginner', sleep_goal_hours = 7.5 } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const mockData = generateMockData({ user_id, fitness_level, sleep_goal_hours })

    return new Response(
      JSON.stringify({ success: true, data: mockData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

**部署步骤：**
```bash
cd supabase/functions/mock-health-data
supabase functions deploy mock-health-data
# 或直接 push 到 Supabase
supabase db push
```

**AI 提示词（给 Cursor）：**
```
请帮我创建 Supabase Edge Function：mock-health-data

功能：
1. 接收参数：user_id, fitness_level, sleep_goal_hours
2. 返回模拟的健康数据（步数、睡眠、心率、活动卡路里等）
3. 数据根据 fitness_level 自动调整

参考实现路径：supabase/functions/mock-health-data/index.ts

请帮我：
1. 初始化 Supabase Functions 项目结构
2. 安装必要依赖
3. 编写 TypeScript 代码
4. 在本地测试（使用 supabase functions serve）
5. 部署到 Supabase

.env 需要配置的内容：
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

### ✅ T2.2 Recovery Score 计算（3h）

**目标：** 实现恢复分算法（核心：睡眠40% + 休息日30% + 活动量20% + 心情10%）

**新建文件：** `supabase/functions/recovery-score/index.ts`

```typescript
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
```

**测试用例（必须在实现前先写）：**

```typescript
// __tests__/recovery-score.test.ts

Deno.test('recovery score - 睡眠充足时应该得高分', () => {
  const result = calculateRecoveryScore({
    sleep_hours: 8.0,
    sleep_quality_score: 90,
    rest_days_consecutive: 0,
    steps: 8000,
    mood: 'good',
  })
  console.assert(result.score >= 70, `期望 ≥70，实际 ${result.score}`)
})

Deno.test('recovery score - 睡眠不足4小时应该得低分', () => {
  const result = calculateRecoveryScore({
    sleep_hours: 3.5,
    sleep_quality_score: 30,
    rest_days_consecutive: 0,
    steps: 3000,
    mood: 'tired',
  })
  console.assert(result.score <= 35, `期望 ≤35，实际 ${result.score}`)
})

Deno.test('recovery score - 连续休息日应该提示训练', () => {
  const result = calculateRecoveryScore({
    sleep_hours: 7.5,
    sleep_quality_score: 80,
    rest_days_consecutive: 2,  // 连续休息2天
    steps: 5000,
    mood: 'great',
  })
  console.assert(result.recommendation === 'train', `期望 train，实际 ${result.recommendation}`)
})

Deno.test('recovery score - 极度疲劳应该提示休息', () => {
  const result = calculateRecoveryScore({
    sleep_hours: 4.0,
    sleep_quality_score: 40,
    rest_days_consecutive: 0,
    steps: 2000,
    mood: 'tired',
  })
  console.assert(result.recommendation === 'rest', `期望 rest，实际 ${result.recommendation}`)
})
```

**验收标准：**
- [ ] 4 个测试用例全部通过
- [ ] Edge Function 部署成功
- [ ] API 可正常调用

---

### ✅ T2.3 Supabase Edge Functions 初始化（1h）

**目标：** 确保前端能调用 Edge Functions

**步骤：**

1. **确认 Supabase CLI 已安装**
   ```bash
   supabase --version
   ```

2. **关联本地项目到 Supabase**
   ```bash
   cd C:\codes\HealthOnPalm
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **配置本地环境**
   ```bash
   supabase status
   # 确认 Local, API, DB, Studio 等状态正常
   ```

4. **启动本地开发**
   ```bash
   supabase functions serve
   # 本地测试 Edge Functions
   ```

5. **部署 T2.1 和 T2.2 的两个 Functions**
   ```bash
   supabase functions deploy mock-health-data
   supabase functions deploy recovery-score
   ```

**验收标准：**
- [ ] Supabase CLI 正常运行
- [ ] 本地开发服务可启动
- [ ] 两个 Functions 部署成功

**AI 提示词（给 Cursor）：**
```
请帮我初始化 Supabase Edge Functions 开发环境：

1. 检查是否已安装 Supabase CLI
   - 运行: supabase --version
   - 如果没有，提示用户安装

2. 如果已有 CLI：
   - 进入项目目录
   - 运行: supabase login（需要用户授权）
   - 运行: supabase link --project-ref YOUR_PROJECT_ID
   - 运行: supabase status

3. 本地开发服务：
   - 安装 deno（如果需要）
   - 启动本地函数服务：supabase functions serve

4. 部署已编写的两个函数：
   - supabase functions deploy mock-health-data
   - supabase functions deploy recovery-score

注意：
- 需要用户提供 project ref（在 Supabase Dashboard → Settings → General）
- 需要用户确认授权登录
```

---

## 📅 Day 9（2026-07-29 周二）

### 目标
Morning Brief Agent 核心逻辑 + Prompt 模板 + 首次调用

---

### ✅ T3.1 Morning Brief Agent — LLM 调用封装（3h）

**目标：** 实现晨间简报的 LLM 调用逻辑

**新建文件：** `supabase/functions/morning-brief/index.ts`

```typescript
// supabase/functions/morning-brief/index.ts
// Deno Edge Function：生成晨间简报

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============ 配置 ============
const SILICONFLOW_API_KEY = Deno.env.get('SILICONFLOW_API_KEY')!
const DEEPSEEK_MODEL = 'deepseek-ai/DeepSeek-V3'

// ============ 类型定义 ============
interface UserProfile {
  id: string
  nickname: string
  age: number
  gender: string
  fitness_level: string
  preferred_workout_time: string
  workout_duration_preference: number
  sleep_goal_hours: number
}

interface HealthData {
  steps: number
  active_calories: number
  stand_hours: number
  sleep: {
    total_hours: number
    deep_sleep_hours: number
    light_sleep_hours: number
    rem_sleep_hours: number
    wake_ups: number
    sleep_quality_score: number
  }
  heart_rate: {
    resting: number
    avg: number
    max: number
  }
  mood: string
  workout_done: boolean
}

interface RecoveryResult {
  score: number
  recommendation: 'train' | 'light' | 'rest'
  breakdown: {
    sleep_score: number
    rest_score: number
    activity_score: number
    mood_score: number
  }
}

// ============ LLM 调用 ============
async function callLLM(prompt: string, maxTokens = 800): Promise<string> {
  const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: 'system',
          content: `你是 HOP，一位专业、温暖、简洁的个人健康教练。
你的特点：
- 简洁直接，不啰嗦
- 语言像朋友在说，不像医生
- 每天只给一个重点行动建议（不多贪）
- 结尾必须附注"以上为非医疗建议，如有不适请咨询医生"

禁止：
- 不提诊断、治疗、处方、药物推荐
- 不给具体重量/组数/次数建议
- 不制造焦虑`
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`LLM API 错误: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || '生成失败，请稍后再试。'
}

// ============ 恢复分计算 ============
async function calculateRecovery(userId: string, healthData: HealthData): Promise<RecoveryResult> {
  // 调用本地 recovery-score 函数
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const res = await fetch(`${supabaseUrl}/functions/v1/recovery-score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
    },
    body: JSON.stringify({
      sleep_hours: healthData.sleep.total_hours,
      sleep_quality_score: healthData.sleep.sleep_quality_score,
      rest_days_consecutive: 0,  // MVP 暂不计算连续休息日
      steps: healthData.steps,
      mood: healthData.mood,
    }),
  })

  const result = await res.json()
  return result
}

// ============ 生成晨间简报 Prompt ============
function buildBriefPrompt(profile: UserProfile, healthData: HealthData, recovery: RecoveryResult): string {
  const recoveryEmoji = recovery.score >= 80 ? '💪' : recovery.score >= 50 ? '☀️' : '😴'
  const workoutText = recovery.recommendation === 'train'
    ? '今天适合运动'
    : recovery.recommendation === 'light'
    ? '今天适合轻度活动'
    : '今天建议以休息为主'

  return `用户信息：
- 姓名：${profile.nickname || '朋友'}
- 年龄：${profile.age || '未知'}岁
- 性别：${profile.gender === 'male' ? '男' : profile.gender === 'female' ? '女' : '其他'}
- 运动水平：${profile.fitness_level === 'beginner' ? '初级' : profile.fitness_level === 'interner' ? '中级' : '高级'}
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
- 今天已运动：${healthData.workout_done ? '是' : '否'}
- 今日心情：${healthData.mood}

恢复分析：
${recoveryEmoji} 恢复分：${recovery.score}/100（睡眠${recovery.breakdown.sleep_score} + 活动${recovery.breakdown.activity_score} + 心情${recovery.breakdown.mood_score}）
${workoutText}

请生成一段晨间简报：
1. 一句温暖问候 + 今日关键词（emoji + 一个词）
2. 今日行动建议（只给一个重点，不贪多）
3. 个性化理由（为什么今天适合/不适合运动，1-2句话）
4. 一个可立刻执行的具体操作建议

语言风格：简洁温暖，像朋友在说，不啰嗦。最多150字。
结尾附注："以上为非医疗建议，如有不适请咨询医生。"`
}

// ============ 写入数据库 ============
async function saveDailySummary(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  healthData: HealthData,
  recovery: RecoveryResult,
  briefText: string,
  workoutReadiness: string
) {
  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase
    .from('daily_summaries')
    .upsert({
      user_id: userId,
      date: today,
      steps: healthData.steps,
      active_calories: healthData.active_calories,
      stand_hours: healthData.stand_hours,
      ai_brief: briefText,
      ai_recovery_score: recovery.score,
      ai_workout_readiness: workoutReadiness,
      context_snapshot: {
        health_data: healthData,
        recovery: recovery,
        generated_at: new Date().toISOString(),
      },
    }, {
      onConflict: 'user_id,date',
    })

  if (error) {
    console.error('保存每日摘要失败:', error)
    throw error
  }
}

// ============ 主入口 ============
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. 解析请求
    const { user_id } = await req.json()
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. 初始化 Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 3. 获取用户档案
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: '用户不存在' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. 获取健康数据（Mock）
    // TODO: W3 替换为真实 HealthKit 数据
    const mockResponse = await fetch(`${supabaseUrl}/functions/v1/mock-health-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        user_id,
        fitness_level: profile.fitness_level || 'beginner',
        sleep_goal_hours: profile.sleep_goal_hours || 7.5,
      }),
    })
    const mockResult = await mockResponse.json()
    const healthData: HealthData = mockResult.data

    // 5. 计算恢复分
    const recovery = await calculateRecovery(user_id, healthData)

    // 6. 生成晨间简报
    const prompt = buildBriefPrompt(profile, healthData, recovery)
    const briefText = await callLLM(prompt)

    // 7. Safety Check（MVP 简化版：关键词过滤）
    const safeText = briefText.includes('非医疗建议')
      ? briefText
      : briefText + '\n\n以上为非医疗建议，如有不适请咨询医生。'

    // 8. 保存到数据库
    await saveDailySummary(supabase, user_id, healthData, recovery, safeText, recovery.recommendation)

    // 9. 记录 Token 消耗
    await supabase.from('token_usage_logs').insert({
      user_id,
      model: DEEPSEEK_MODEL,
      tokens_in: Math.floor(prompt.length / 4),  // 估算
      tokens_out: Math.floor(safeText.length / 4),
      cost: (prompt.length / 4 / 1_000_000 * 0.5) + (safeText.length / 4 / 1_000_000 * 1.5),  // 估算成本
      request_type: 'morning_brief',
      success: true,
    })

    // 10. 返回结果
    return new Response(JSON.stringify({
      success: true,
      data: {
        brief: safeText,
        recovery_score: recovery.score,
        workout_readiness: recovery.recommendation,
        health_data: healthData,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Morning Brief 生成失败:', error)

    // 记录失败
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

**验收标准：**
- [ ] Edge Function 部署成功
- [ ] 调用返回完整简报
- [ ] 数据保存到 daily_summaries 表
- [ ] Token 消耗记录到 token_usage_logs

---

### ✅ T3.2 SiliconFlow（硅基流动）API 配置（1h）

**目标：** 配置 SiliconFlow，连接 DeepSeek-V3（国内可直连，无需魔法上网）

**步骤：**

1. **注册 SiliconFlow**
   - 访问 [https://cloud.siliconflow.cn](https://cloud.siliconflow.cn)（或 [siliconflow.cn](https://siliconflow.cn)）
   - 用手机号 + 验证码登录，**无需实名**即可获得 2000 万 tokens 免费额度
   - 进入 [API 密钥](https://cloud.siliconflow.cn/account/ak) 页面

2. **创建 API Key**
   ```
   点击 "新建 API 密钥"
   名称：health-agent-mvp
   复制生成的 Key（格式：sk-xxxxx...）
   ⚠️ 妥善保管，不要提交到 git
   ```

3. **检查免费额度**
   ```
   新用户注册即送 2000 万 tokens（约 ¥14 等值）
   MVP 测试阶段基本零成本
   查看模型价格：https://cloud.siliconflow.cn/models
   DeepSeek-V3：输入 ¥1/百万 tokens，输出 ¥2/百万 tokens
   ```

4. **配置环境变量**
   ```bash
   # .env.local 更新
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   SILICONFLOW_API_KEY=sk-xxxxx...   # ← 新增（SiliconFlow API Key）
   ```

5. **在 Supabase Dashboard 配置 Secrets**
   - 进入 Supabase Dashboard → Project Settings → Edge Functions
   - 添加 Secret：
     - Name: `SILICONFLOW_API_KEY`
     - Value: `sk-xxxxx...`

6. **测试调用**
   ```bash
   # 本地测试（先启动 supabase functions serve）
   curl -X POST "http://localhost:54321/functions/v1/morning-brief" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -d '{"user_id": "YOUR_USER_ID"}'
   ```

**API 格式说明（OpenAI 兼容）：**
- Base URL：`https://api.siliconflow.cn/v1`
- Chat：`POST /v1/chat/completions`，模型 `deepseek-ai/DeepSeek-V3`
- Embedding：`POST /v1/embeddings`，模型 `BAAI/bge-m3`（1024 维）
- 鉴权：`Authorization: Bearer <SILICONFLOW_API_KEY>`

**成本参考（DeepSeek-V3 @ SiliconFlow）：**
| 调用次数 | Token 估算 | 成本 |
|---------|-----------|------|
| 1 次简报 | ~2000 tokens | ¥0.005 |
| 1000 次 | ~2M tokens | ¥5-10 |

---

## 📅 Day 10（2026-07-30 周三）

### 目标
Safety Agent + Memory Agent（L1+L2）

---

### ✅ T4.1 Safety Agent — 安全审查规则引擎（2h）

**目标：** 实现两层安全审查（规则引擎 + LLM）

**新建文件：** `supabase/functions/safety-check/index.ts`

```typescript
// supabase/functions/safety-check/index.ts
// Deno Edge Function：健康建议安全审查

// ============ 第一层：规则引擎（毫秒级） ============
const MEDICAL_BLOCKED_PATTERNS = [
  // 诊断类
  /诊断|确诊|患有|得了|xx病|xx症/i,
  // 药品类
  /阿司匹林|布洛芬|降压药|胰岛素|抗生素|处方药|药品|服药/i,
  // 严重症状
  /胸痛|胸闷|呼吸困难|咳血|昏迷|半身不遂/i,
  // 精神健康
  /自杀|自残|想死|抑郁症|焦虑症|精神分裂/i,
  // 疾病名称
  /高血压|糖尿病|心脏病|癌症|肿瘤|艾滋病/i,
]

const MEDICAL_REFERRED_PATTERNS = [
  /一直疼|持续疼|越来越严重|流血|伤口|骨折/i,
  /怀孕|备孕|月经不调|妇科问题/i,
  /儿童|老人|患者.*身体/i,
]

function safetyFirstPass(text: string): {
  passed: boolean
  action: 'BLOCK' | 'REFER' | 'ALLOW'
  response: string | null
  matchedPattern: string | null
} {
  for (const pattern of MEDICAL_BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        passed: false,
        action: 'BLOCK',
        response: '我不是医生，您描述的情况涉及专业医疗判断，建议尽快就医或咨询专业医疗人员。\n\n以上为非医疗建议，如有不适请咨询专业医生。',
        matchedPattern: pattern.source,
      }
    }
  }

  for (const pattern of MEDICAL_REFERRED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        passed: true,
        action: 'REFER',
        response: '我不是医生，关于这个问题，建议您咨询专业医生获得准确建议。\n\n以上为非医疗建议，如有不适请咨询专业医生。',
        matchedPattern: pattern.source,
      }
    }
  }

  return { passed: true, action: 'ALLOW', response: null, matchedPattern: null }
}

// ============ 第二层：LLM 审查（复杂情况） ============
async function safetyLLMCheck(text: string, userContext?: string): Promise<{
  safe: boolean
  riskLevel: 'none' | 'low' | 'medium' | 'high'
  riskReason?: string
  safeAlternative?: string
}> {
  const SILICONFLOW_API_KEY = Deno.env.get('SILICONFLOW_API_KEY')!
  const prompt = `请检查以下健康建议是否存在医疗风险：

建议内容：
${text}

${userContext ? `用户背景：${userContext}` : ''}

检查维度（逐一判断）：
1. 是否包含诊断/治疗/处方内容？
2. 是否建议了具体的医疗行为？
3. 是否有任何可能造成用户焦虑的内容？
4. 是否有任何可能引发饮食障碍的饮食建议？

输出 JSON（不要有其他内容）：
{
  "safe": true或false,
  "riskLevel": "none"或"low"或"medium"或"high",
  "riskReason": "如果有风险，说明原因",
  "safeAlternative": "如果需要，给出安全替代话术"
}`

  try {
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0,
      }),
    })

    const data = await response.json()
    const resultText = data.choices[0]?.message?.content || '{}'

    // 解析 JSON
    const result = JSON.parse(resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

    return {
      safe: result.safe ?? true,
      riskLevel: result.riskLevel ?? 'none',
      riskReason: result.riskReason,
      safeAlternative: result.safeAlternative,
    }
  } catch {
    // LLM 失败时保守处理
    return { safe: false, riskLevel: 'high', riskReason: '安全检查服务暂时不可用', safeAlternative: '建议您咨询专业医生。' }
  }
}

// ============ 主入口 ============
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, user_context, skip_llm_check = false } = await req.json()

    if (!text) {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 第一层：规则引擎
    const firstPass = safetyFirstPass(text)

    if (firstPass.action === 'BLOCK') {
      return new Response(JSON.stringify({
        safe: false,
        action: 'BLOCK',
        response: firstPass.response,
        layer: 'rule_engine',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (firstPass.action === 'REFER') {
      return new Response(JSON.stringify({
        safe: true,
        action: 'REFER',
        response: firstPass.response,
        layer: 'rule_engine',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 第二层：LLM 检查（可选，节省 Token）
    if (!skip_llm_check) {
      const llmResult = await safetyLLMCheck(text, user_context)

      if (!llmResult.safe || llmResult.riskLevel === 'high') {
        return new Response(JSON.stringify({
          safe: false,
          action: 'REFER',
          response: llmResult.safeAlternative || '这个问题建议咨询专业医生。\n\n以上为非医疗建议，如有不适请咨询专业医生。',
          layer: 'llm',
          riskLevel: llmResult.riskLevel,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // 通过：确保有免责声明
    const finalText = text.includes('非医疗建议')
      ? text
      : text + '\n\n以上为非医疗建议，如有不适请咨询专业医生。'

    return new Response(JSON.stringify({
      safe: true,
      action: 'ALLOW',
      response: finalText,
      layer: skip_llm_check ? 'rule_engine' : 'llm',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

**测试用例：**

```typescript
// 应该被拦截的内容
const blockedCases = [
  '你可能患有高血压，建议服用降压药',
  '根据你的症状，我诊断你可能有糖尿病',
  '你应该去医院住院治疗',
]

// 应该被转介的内容
const referredCases = [
  '你最近一直头疼，应该去看医生',
  '这个伤口需要缝合，建议去医院',
]

// 应该通过的内容
const allowedCases = [
  '今天状态不错，建议做30分钟有氧运动',
  '睡眠质量不好的话，可以尝试睡前减少使用手机',
  '如果你觉得疲劳，可以考虑多休息',
]
```

**验收标准：**
- [ ] BLOCK 类内容全部拦截
- [ ] REFER 类内容给出转介提示
- [ ] ALLOW 类内容通过并补充免责声明
- [ ] LLM 检查不增加明显延迟（< 1s）

---

### ✅ T4.2 Memory Agent — L1 Working Memory（1.5h）

**目标：** 实现对话记忆的读写（Working Memory）

**新建文件：** `supabase/functions/memory-working/index.ts`

```typescript
// supabase/functions/memory-working/index.ts
// Deno Edge Function：L1 Working Memory 管理

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

async function summarizeMessages(messages: Message[]): Promise<string> {
  const SILICONFLOW_API_KEY = Deno.env.get('SILICONFLOW_API_KEY')!
  const messagesText = messages.map(m => `${m.role}: ${m.content}`).join('\n')

  const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [
        {
          role: 'system',
          content: '你是记忆压缩专家。请将以下对话压缩为一段200字以内的摘要，保留关键信息和模式。'
        },
        {
          role: 'user',
          content: messagesText
        }
      ],
      max_tokens: 200,
      temperature: 0,
    }),
  })

  const data = await response.json()
  return data.choices[0]?.message?.content || '对话摘要生成失败'
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
    const supabase = (await import('https://esm.sh/@supabase/supabase-js@2')).createClient(supabaseUrl, supabaseKey)

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
```

**验收标准：**
- [ ] 写入消息后，可读取到最新消息
- [ ] 超过 12 轮自动触发摘要
- [ ] 摘要保存在 context_summary 字段

---

### ✅ T4.3 Memory Agent — L2 Episodic Memory（1.5h）

**目标：** 实现历史事件的向量存储和检索

**新建文件：** `supabase/functions/memory-episodic/index.ts`

```typescript
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
    const supabase = (await import('https://esm.sh/@supabase/supabase-js@2')).createClient(supabaseUrl, supabaseKey)

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
```

**⚠️ 需要先创建 pgvector RPC 函数（在 SQL Editor 执行）：**

```sql
-- 创建向量搜索 RPC 函数
CREATE OR REPLACE FUNCTION match_health_memories(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  user_id_param UUID
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  memory_source TEXT,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    hm.id,
    hm.content,
    hm.memory_source,
    hm.created_at,
    1 - (hm.content_embedding <=> query_embedding) AS similarity
  FROM health_memories hm
  WHERE
    hm.user_id = user_id_param
    AND hm.memory_type = 'episodic'
    AND hm.deleted_at IS NULL
    AND hm.compressed = FALSE
    AND (1 - (hm.content_embedding <=> query_embedding)) > match_threshold
  ORDER BY hm.content_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ==========================================
-- ⚠️ W1 已创建的表需要同步修改向量维度
-- W1 中 health_memories.content_embedding 定义为 VECTOR(1024)
-- SiliconFlow 的 BAAI/bge-m3 输出 1024 维，必须执行一次：
-- ==========================================
ALTER TABLE public.health_memories
  ALTER COLUMN content_embedding TYPE VECTOR(1024);

COMMENT ON COLUMN public.health_memories.content_embedding
  IS 'BAAI/bge-m3 embedding，1024 维（SiliconFlow）';
```

**验收标准：**
- [ ] 可以写入记忆
- [ ] 可以检索相关记忆
- [ ] 向量相似度搜索工作正常

---

## 📅 Day 11（2026-07-31 周四）

### 目标
Query Agent + Workout Agent

---

### ✅ T5.1 Query Agent — 健康问答（2.5h）

**新建文件：** `supabase/functions/query-agent/index.ts`

```typescript
// supabase/functions/query-agent/index.ts
// Deno Edge Function：健康问答 Agent

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SILICONFLOW_API_KEY = Deno.env.get('SILICONFLOW_API_KEY')!
const DEEPSEEK_MODEL = 'deepseek-ai/DeepSeek-V3'

interface AgentContext {
  user_id: string
  query: string
  conversation_history?: any
  recent_memories?: any[]
  health_data?: any
}

async function getUserContext(supabase: any, userId: string) {
  // 获取用户档案
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  // 获取最近7天运动记录
  const { data: workouts } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(7)

  // 获取最近7天睡眠
  const { data: sleeps } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(3)

  return { profile, workouts: workouts || [], sleeps: sleeps || [] }
}

async function searchMemories(supabase: any, userId: string, query: string) {
  // MVP 简化版：从 episodic memories 搜索相关
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

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  })

  const data = await response.json()
  return data.choices[0]?.message?.content || '抱歉，生成回答时遇到问题，请稍后再试。'
}

function buildSystemPrompt(): string {
  return `你是 HOP，一位专业、温暖、简洁的个人健康教练。

你的职责：
- 回答用户关于运动、睡眠、疲劳、健康习惯的问题
- 提供一般性的健康建议（非医疗建议）
- 鼓励用户养成健康的生活习惯

回答规则（严格遵守）：
1. 绝对不提"诊断""治疗""处方""药物推荐"
2. 所有建议结尾必须附注："以上为非医疗建议，如有不适请咨询医生。"
3. 如果用户描述的症状持续或严重，建议就医
4. 回答简洁，3-5句话为主（趋势分析不超过200字）
5. 不要过度医疗化用户的普通疲劳或不适
6. 语气温暖，像朋友在给建议，不是医生在问诊
7. 如果不确定，直接说"我不确定"，不要编造

禁止输出：
- 任何药品名/保健品名
- 任何医疗机构/医生的具体推荐
- 任何涉及精神健康的诊断性表述`
}

function buildUserPrompt(query: string, context: any, memories: any[], profile: any): string {
  let prompt = `用户问题：${query}\n\n`

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
    const avgSleep = context.sleeps.reduce((a: number, b: any) => a + (b.total_sleep_hours || 0), 0) / context.sleeps.length
    prompt += `最近睡眠：
- 平均睡眠：${avgSleep.toFixed(1)}小时
- 最近记录：${context.sleeps[0].date}\n\n`
  }

  if (memories.length > 0) {
    prompt += `相关历史记忆：
${memories.map((m: any) => `- ${m.created_at.split('T')[0]}：${m.content}`).join('\n')}\n\n`
  }

  prompt += `请根据以上信息，给出回答。`

  return prompt
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
    const { user_id, query } = await req.json()

    if (!user_id || !query) {
      return new Response(JSON.stringify({ error: 'user_id and query are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. 获取上下文
    const context = await getUserContext(supabase, user_id)

    // 2. 搜索相关记忆
    const memories = await searchMemories(supabase, user_id, query)

    // 3. 调用 LLM 生成回答
    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(query, context, memories, context.profile)
    const response = await callLLM(systemPrompt, userPrompt)

    // 4. Safety Check
    const safetyRes = await fetch(`${supabaseUrl}/functions/v1/safety-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        text: response,
        skip_llm_check: true,  // MVP 节省 Token
      }),
    })
    const safetyData = await safetyRes.json()

    return new Response(JSON.stringify({
      success: true,
      response: safetyData.response || response,
      safety_passed: safetyData.safe ?? true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

**验收标准：**
- [ ] 可以回答常见的健康问题
- [ ] 上下文注入用户档案和历史数据
- [ ] 所有回答包含免责声明

---

### ✅ T5.2 Workout Agent — 训练建议（2h）

**新建文件：** `supabase/functions/workout-agent/index.ts`

核心逻辑类似 Query Agent，System Prompt 专注于训练建议场景：

```typescript
// 核心 System Prompt（Workout Agent 专用）
const WORKOUT_SYSTEM_PROMPT = `你是 HOP 的专业健身教练。

你的职责：
- 根据用户的恢复分和偏好，生成个性化的今日训练建议
- 提供安全、科学的训练指导

回答规则：
1. 恢复分 < 50：只给拉伸/散步/休息建议（不推荐任何强度训练）
2. 恢复分 50-80：给中等强度建议（训练量 = 偏好的70%）
3. 恢复分 > 80：可给正常强度建议
4. 不提供具体的重量/组数/次数（建议用户咨询专业教练）
5. 训练类型尽量与用户历史偏好一致
6. 提供3-5个具体动作名称和要点
7. 估算热量消耗
8. 说明"为什么今天适合这个训练"（个性化理由）

禁止：
- 不建议用户超负荷训练
- 不给受伤后的训练建议
- 不给未成年人的力量训练建议
- 所有建议结尾附注："以上为非医疗建议，如有不适请咨询医生或专业教练。"`
```

**验收标准：**
- [ ] 根据不同恢复分给出不同强度的建议
- [ ] 不在疲劳状态下建议高强度训练
- [ ] 动作建议具体但不过度精确

---

## 📅 Day 12（2026-08-01 周五）

### 目标
AI 对话界面 + 首页晨间简报卡片

---

### ✅ T6.1 AI 对话界面开发（3h）

**AI 提示词（给 Cursor）：**

```
请帮我创建 HOP 的 AI 对话界面（Vue 3 + TypeScript + uni-app）：

页面路径：src/pages/chat/index.vue

功能需求：
1. 聊天界面（类似微信对话样式）
   - 左侧：用户消息（绿色背景）
   - 右侧：AI 消息（白色背景）
   - 底部：输入框 + 发送按钮

2. 输入区域
   - 多行文本输入（最多200字）
   - 发送按钮（Loading 状态）
   - 空内容不可发送

3. 消息显示
   - 消息时间（每5分钟显示一次）
   - AI 回复打字机效果（可选）
   - 消息气泡样式

4. 调用 AI
   - 用户发送消息时，调用 Supabase Edge Function
   - Endpoint: /functions/v1/query-agent
   - 参数: { user_id, query }
   - 显示 AI 回复

5. 记忆注入
   - 发送消息前，先调用 memory-working write
   - 收到回复后，再调用 memory-working write
   - 获取上下文时，调用 memory-working read

6. 欢迎消息
   - 首次打开时，显示欢迎消息：
     "你好！我是你的健康助手。有什么关于运动、睡眠、恢复的问题，随时问我～"

技术要求：
- 使用 uni-app scroll-view 实现滚动
- 使用 Pinia 管理对话状态
- 消息数据存储在 conversations 表
- Loading 状态显示

UI 设计：
- 聊天背景：浅灰色
- 用户消息：绿色背景（#10B981），白色文字，右对齐
- AI 消息：白色背景，深色文字，左对齐
- 输入框：底部固定，圆角
- 顶部：返回按钮 + 标题"健康助手"

请生成完整代码。
```

**验收标准：**
- [ ] 可以发送和接收消息
- [ ] 消息显示样式正确
- [ ] AI 回复正常
- [ ] 加载状态显示

---

### ✅ T6.2 首页晨间简报卡片（1.5h）

**AI 提示词（给 Cursor）：**

```
请更新 HOP 的首页（src/pages/index/index.vue）：

新增功能：晨间简报卡片

卡片设计：
- 位置：在"今日数据"卡片上方
- 标题："☀️ 今日晨报"
- 内容：
  - 恢复分（圆形进度条，显示数字 /100）
  - 训练建议（训练/轻度/休息，带颜色标识）
  - 简报文字（AI 生成）
  - 刷新按钮

交互逻辑：
1. 页面加载时，自动调用 morning-brief Edge Function
   - Endpoint: /functions/v1/morning-brief
   - 参数: { user_id }
   - 显示 Loading

2. 调用成功后，显示：
   - 恢复分（从 ai_recovery_score 读取）
   - 训练建议（从 ai_workout_readiness 读取）
   - 简报内容（从 ai_brief 读取）

3. 如果已有今日数据（daily_summaries 表），直接读取不重复调用

4. 刷新按钮：
   - 点击重新调用 morning-brief
   - 显示 Loading 状态

5. 错误处理：
   - 网络错误：显示"加载失败，点击重试"
   - 无数据：显示"暂无简报，稍后再来看看"

样式：
- 卡片背景：白色
- 恢复分：绿色（≥80）/ 橙色（50-79）/ 灰色（<50）
- 训练建议：训练=💪 绿色，轻度=☀️ 橙色，休息=😴 灰色

请更新现有首页代码。
```

**验收标准：**
- [ ] 打开首页自动加载晨间简报
- [ ] 恢复分正确显示
- [ ] 简报内容显示
- [ ] 刷新功能正常

---

## 📅 Day 13（2026-08-02 周六）

### 目标
定时任务 + 推送机制 + 优化调整

---

### ✅ T7.1 定时任务配置（1.5h）

**目标：** 配置每日晨间简报自动生成（Supabase Cron）

> **实际运行（2026-08-24）：** 产品**没有**依赖 pg_cron / 微信服务通知做晨间推送。简报在用户打开首页（或点刷新）时生成或读缓存。下列 SQL 若未在项目中执行，不影响现行 App。

**在 Supabase SQL Editor 执行：**

```sql
-- 启用 pg_cron 扩展
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 调度：每天早上 7:30 UTC = 下午 3:30 北京时间
-- 注意：MVP 阶段先不做推送，用户主动打开 App 才生成简报
-- 这里只配置数据库清理任务

-- 每周日凌晨清理过期的 working memory
SELECT cron.schedule(
  'cleanup-expired-memories',
  '0 23 * * 0',  -- 每周日 23:00 UTC
  $$
  UPDATE health_memories
  SET deleted_at = NOW()
  WHERE memory_type = 'working'
  AND deleted_at IS NULL
  AND created_at < NOW() - INTERVAL '7 days';
  $$
);

-- 每月1号清理旧的 token 使用记录（保留最近90天）
SELECT cron.schedule(
  'cleanup-token-logs',
  '0 1 1 * *',  -- 每月1号 1:00 UTC
  $$
  DELETE FROM token_usage_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);
```

**Supabase Dashboard 配置（替代方案）：**
- 进入 Dashboard → Database → Extensions
- 启用 `pg_cron`
- 进入 Project Settings → Cron Jobs
- 点击 "New cron job"
  - Name: `generate-morning-briefs`
  - Schedule: `30 7 * * *`（每天 7:30 UTC）
  - SQL: 调用 Edge Function（通过 pg_net）

**⚠️ MVP 阶段注意：**
推送功能 W2 先不做，原因：
1. 微信服务通知需要用户主动订阅，流程复杂
2. 每天早上 7:30 生成简报，用户打开 App 时直接读取
3. 节省推送实现时间

**MVP 推送方案（简化版）：**
- 用户打开 App → 检查今日是否有简报 → 没有则自动生成
- 不做定时推送

---

### ✅ T7.2 前端状态优化（1h）

**目标：** 优化用户体验

**新增内容：**

1. **首页 Loading 骨架屏**
   ```vue
   <!-- Skeleton 组件 -->
   <template>
     <view class="skeleton">
       <view class="skeleton-title"></view>
       <view class="skeleton-content"></view>
       <view class="skeleton-actions"></view>
     </view>
   </template>
   ```

2. **错误重试机制**
   - API 调用失败时，显示"点击重试"按钮
   - 自动重试最多 2 次

3. **Token 成本提示（MVP 测试阶段）**
   - 控制台打印每次 LLM 调用的成本估算
   - 方便调试

---

### ✅ T7.3 API 调用封装优化（1h）

**新增文件：** `src/api/agent.ts`

```typescript
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
```

**验收标准：**
- [ ] 所有 API 调用统一封装
- [ ] 错误处理统一
- [ ] TypeScript 类型完整

---

## 📅 Day 14（2026-08-03 周日）

### 目标
集成测试 + Bug 修复 + W2 里程碑验收

---

### ✅ T8.1 集成测试（3h）

**测试清单：**

```markdown
## W2 集成测试清单

### Morning Brief Agent

- [ ] 1.1 打开 App，首页显示晨间简报（< 5s）
- [ ] 1.2 恢复分正确计算（与 mock 数据吻合）
- [ ] 1.3 简报语言简洁、温暖
- [ ] 1.4 简报包含免责声明
- [ ] 1.5 刷新按钮重新生成
- [ ] 1.6 重复打开不重复调用（读取缓存）

### Safety Agent

- [ ] 2.1 输入"我可能得了高血压"，被拦截
- [ ] 2.2 输入"一直头疼怎么办"，被转介
- [ ] 2.3 正常健康问题通过
- [ ] 2.4 所有通过内容包含免责声明

### Memory Agent

- [ ] 3.1 发送消息，写入 working memory
- [ ] 3.2 刷新页面，对话历史保持
- [ ] 3.3 对话超过12轮，触发摘要

### Query Agent

- [ ] 4.1 问"我最近睡得好不好"，AI 给出分析
- [ ] 4.2 问"今天适合什么运动"，AI 给出建议
- [ ] 4.3 问"我肩膀酸"，AI 不给诊断，给出建议
- [ ] 4.4 上下文注入用户档案

### AI 对话界面

- [ ] 5.1 消息发送成功
- [ ] 5.2 AI 回复显示
- [ ] 5.3 Loading 状态显示
- [ ] 5.4 滚动到最新消息

### Edge Functions

- [ ] 6.1 morning-brief 部署成功
- [ ] 6.2 query-agent 部署成功
- [ ] 6.3 safety-check 部署成功
- [ ] 6.4 memory-working 部署成功
- [ ] 6.5 recovery-score 部署成功
- [ ] 6.6 mock-health-data 部署成功

### 数据库

- [ ] 7.1 daily_summaries 每日记录正确
- [ ] 7.2 conversations 保存对话
- [ ] 7.3 health_memories 保存记忆
- [ ] 7.4 token_usage_logs 记录调用

### 成本监控

- [ ] 8.1 检查 token_usage_logs，确认消耗记录
- [ ] 8.2 估算月成本（50用户 × 每日4次调用）
- [ ] 8.3 确认 DeepSeek-V3 为主力模型
```

---

### ✅ T8.2 Bug 修复（1.5h）

| Bug ID | 描述 | 优先级 | 状态 |
|--------|------|-------|------|
| BUG-W2-001 | 示例：Edge Function 调用超时 | High | Open |
| ... | | | |

---

### ✅ T8.3 W2 里程碑验收（1.5h）

**W2 验收标准：**

| 功能 | 验收条件 | 状态（现行） |
|------|---------|--------------|
| Morning Brief | 用户打开 App 能看到今日简报 | ✅（数据现来自 HealthKit/混合/Mock，见 W3/W4） |
| Recovery Score | 计算结果与输入数据逻辑一致 | ✅（细则见 W4 重做） |
| Safety Agent | BLOCK/REFER/ALLOW 分类正确 | ✅ |
| Query Agent | 常见健康问题回答合理 | ✅ |
| Workout Agent | 不同恢复分给出不同强度建议 | ✅ 文案；可执行计划见 W4 |
| Memory Agent | 对话历史可加载 | ✅ |
| AI 对话界面 | 消息发送/接收正常 | ✅；语音 W3 |
| Edge Functions | 已部署到目标项目 | ✅ `zewznptbyhurxaqirzmb` |
| 数据库 | 简报等写入 `daily_summaries` | ✅ |
| 成本 | 远低于 ¥200/月量级 | ✅ 种子规模 |

---

## 📊 W2 里程碑验收清单

> 勾选 = **现行运行**（2026-08-24）。

### 必须完成（P0）

- [x] Morning Brief Agent 核心闭环跑通（生成 → Safety → 保存）
- [x] 相关 Edge Functions 部署成功
- [x] AI 对话界面可正常使用（文字）
- [x] Safety Agent 无漏放（BLOCK/REFER 正常工作）
- [x] Memory Agent L1 Working Memory 读写正常
- [x] 集成测试无阻塞性 Bug（主路径）

### 可选完成（P1）

- [x] Memory Agent L2 Episodic Memory（有则用，失败可降级）
- [x] Recovery Score（W2 初版；**连续休息 / 缺睡眠规则在 W4 加强**）
- [x] UI Loading / 错误提示（后续页持续打磨）
- [ ] 定时任务配置（pg_cron）— **现行未作为产品路径**

### W2 暂不做（当时写 V1.0）

- ❌ 定时推送（微信服务通知）— **至今未做**
- ❌ 真实 HealthKit 数据 — **W3 已做**，W4 扩展类型与自动同步
- ❌ 订阅付费 — **至今未做**
- ❌ Android 数据接入 — **至今未做**

---

## 📊 W2 成本监控（SiliconFlow 硅基流动）

**模型与价格：**
- 主力模型：`deepseek-ai/DeepSeek-V3`（聊天）
- Embedding：`BAAI/bge-m3`（1024 维）
- 价格（参考）：输入 ¥1 / 百万 tokens，输出 ¥2 / 百万 tokens
- **新用户注册送 2000 万 tokens 免费额度**（约 ¥14 等值），MVP 测试阶段基本零成本

**预期 LLM 成本（50 用户测试）：**

| 功能 | 每日调用次数 | 估算 Token/次 | 每日成本 | 月成本 |
|------|------------|--------------|---------|-------|
| Morning Brief | 50 | ~2000 | ¥0.12 | ¥3.6 |
| Query Agent | 150 | ~800 | ¥0.18 | ¥5.4 |
| Safety Check（规则引擎为主，LLM 仅复杂场景） | 200 | ~150 | ¥0.06 | ¥1.8 |
| Memory 摘要 | 5 | ~500 | ¥0.01 | ¥0.3 |
| **总计** | **405** | | **¥0.37/日** | **¥11/月** |

> ✅ 远低于 ¥200/月预算；且免费额度可覆盖约 1-2 个月测试，实际支出可能为零。

---

## 📅 W3 预览

> **2026-08-24：** W3 **实际**做了 HealthKit、手动运动/睡眠、简报反馈、邮箱登录、语音、TestFlight 材料。  
> **没有**做微信支付；种子是「5 人以内」而非 10 人。完整 W3 见 `doc/W3 详细执行计划_MVP第三阶段.md`。

当时预告（部分未按此执行）：

```
W3 任务预览（历史）：
├── HealthKit 数据同步（iOS 真实数据）     ✅ 已做
├── 运动记录页面                           ✅ 已做
├── 睡眠记录页面                           ✅ 已做
├── 用户反馈机制（采纳/忽略）              ✅ 已做（含修改）
├── 订阅体系基础（微信支付接入）            ❌ 未做
└── 种子用户测试（原文 10 人）             ♻️ 材料已备；正式 3–5 人反馈表未在仓库填满
```

---

## 🛠️ W2 开发工具

| 工具 | 用途 | 关键命令 |
|------|------|---------|
| Supabase CLI | Edge Functions 开发 | `supabase functions serve` |
| Deno | Edge Functions 运行时 | 内置于 Supabase |
| Postman | API 测试 | 手动测试 Edge Functions |
| Supabase Dashboard | 查看 Edge Function 日志 | Dashboard → Edge Functions |

---

*文档版本：v1.1（2026-08-24 按实际运行修订）*  
*创建日期：2026-07-27*  
*预计执行：2026-07-28 至 2026-08-03*  
*前置依赖：W1 全部完成*
