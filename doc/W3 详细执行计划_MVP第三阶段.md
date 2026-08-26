# Health On Palm (HOP) MVP — W3 详细执行计划

> **阶段目标**：HealthKit 真实数据同步跑通 + 手动记录 UI 完成 + 5人以内种子用户内测  
> **时间范围**：Day 15 - Day 28（2026-07-29 至 2026-08-11）  
> **验收标准（计划）**：3-5名种子用户可正常使用核心功能（晨间简报 + 健康问答 + 语音输入/播报），AI 回答基于真实健康数据  
> **日均投入**：2-4 小时（OPC 模式）  
> **文档修订**：2026-08-07 中期变更；**2026-08-24 按实际运行补全验收与对照**

---

## 📋 实际运行对照（2026-08-24）

W3 把 **iOS HealthKit + 手动运动/睡眠 + 晨报反馈 + 邮箱登录 + 语音 + TestFlight 材料**做成了可装包产品。下列与计划稿不同：

| 项 | 实际运行 |
|----|----------|
| 主路径 | **iOS App**；微信小程序 **不是**交付物 |
| 插件路径 | `uni-app/src/uni_modules/health-agent-healthkit/`（不是仓库根 `src/`） |
| `sync-healthkit` | **已完成并部署**（下文 T3.1 曾写「用户待做」，以本节为准） |
| SQL | 以 `supabase/migrations/20260806_w3_sync_healthkit.sql` 为准，不是 T3.1 里另写一套建表 |
| 底部导航（W3 结束时） | **三 Tab：首页 / 记录 / 我的**；五 Tab 是 **W4** |
| HealthKit 类型（W3 结束时） | 步数、活动热量、锻炼分钟、站立、睡眠、静息/平均心率、Workout；**基础代谢当时未真正查询** |
| 自动同步 | W3 以授权页手动刷新为主；**半小时/跨日自动同步与晨报前同步是 W4** |
| 种子用户 | 开发者 **TestFlight + 真机**已跑通；`种子用户反馈追踪表` **仓库内仍为空表**，正式 3–5 人反馈报告未归档 |
| 说明书 | W3 期间有 **v1.0**（2026-08-08）；v1.1 在 W4 |
| USB 调试 | 自定义基座必须 **开发证书**；TestFlight 用 **发布证书**（W4 踩坑后写明） |

W3 之后的训练计划闭环、心情、恢复分、首页缓存、HealthKit 扩展：见 `doc/W4 详细执行记录_产品闭环与体验增强.md`。

---

## 📋 W3 中期变更（2026-08-07）

> 以下为计划执行中已落地的产品/技术变更，后续 T8/T10 与种子用户材料以本节为准。

### 1. 登录方式：手机号验证码 → 邮箱 + 密码

| 项 | 说明 |
|----|------|
| **原因** | 省去短信通道成本与依赖，便于种子内测快速开户 |
| **现状** | 登录页支持「注册 / 登录」；Supabase Auth Email Provider |
| **配置** | Authentication → Email 开启；内测建议 **关闭 Confirm email** |
| **代码** | `pages/login/index.vue`、`stores/user.ts`、`api/supabase-auth.ts` |
| **兼容** | 旧手机号会话不再作为主路径；种子用户请用邮箱重新注册 |

### 2. HOP 助手语音（计划外加分，已完成）

| 能力 | 说明 |
|------|------|
| **语音输入** | 按住「语音」录音 → `speech-to-text`（SiliconFlow SenseVoice）→ 填入输入框 |
| **语音播报** | 助手气泡「播放」→ `text-to-speech`（CosyVoice2）→ Storage 签名 URL → `downloadFile` 播放 |
| **原生模块** | `manifest`：`Record`、`Audio`；iOS `NSMicrophoneUsageDescription` |
| **前端** | `lib/chat/voice.ts`、`api/speech.ts`、`pages/chat/index.vue` |
| **部署** | Edge：`speech-to-text`、`text-to-speech`；Storage 桶 `tts-cache` |

### 3. 种子用户安装：TestFlight（远程）

| 项 | 说明 |
|----|------|
| **路径** | 已有 Apple Developer 付费账号 + 远程用户 → **TestFlight 内部测试** |
| **不要用** | 微信小程序体验码（无法验证 HealthKit）；自定义调试基座（仅开发者本机） |
| **材料** | `doc/种子用户内测说明_v0.1.md`、`doc/种子用户反馈追踪表_v0.1.md` |

---

## 📋 W3 定位说明

### W2 → W3 的核心转变

| 维度 | W2 | W3 |
|------|----|----|
| 数据来源 | Mock 模拟数据 | **HealthKit 真实数据**（iOS） |
| 数据入口 | 全自动 | **自动同步 + 手动补充** |
| 测试方式 | 开发者自测 | **3-5名种子用户体验反馈** |
| 产品状态 | 功能 Demo | **可交付给真实用户使用** |

### W3 关键假设（用户确认）

- **HealthKit 接入**：W3 实现，使用**自研 UTS 插件** `health-agent-healthkit`（Cursor 已完成）
  > ⚠️ 重要澄清：微信小程序无法直接访问 HealthKit。**W3 主路径是 iOS App（HBuilderX 自定义基座/云打包）**，而非微信小程序
- **自研 UTS 插件已完成**（Cursor 2026-07-29 完成）：
  - `uni-app/src/uni_modules/health-agent-healthkit/utssdk/app-ios/HealthKitBridge.swift` — 原生读取
  - `uni-app/src/uni_modules/health-agent-healthkit/utssdk/app-ios/index.uts` — iOS 导出入口
  - `uni-app/src/uni_modules/health-agent-healthkit/utssdk/app-ios/UTS.entitlements` — HealthKit Capability
  - `uni-app/src/uni_modules/health-agent-healthkit/utssdk/index.uts` — H5/非 iOS stub
  - `uni-app/src/uni_modules/health-agent-healthkit/index.d.ts` — TypeScript 类型
  - `uni-app/src/lib/healthkit/index.ts` — 业务适配层（`isAvailable / authorize / fetchToday / syncTodayFromDevice`）
- **测试平台**：
  - ✅ **iOS App 真机**：完整 HealthKit（W3 唯一验收路径）
  - ⚠️ 微信小程序：只能接 WeRun 步数（P2），无法测 HealthKit
  - ❌ H5：`dev:h5` 无法验证 HealthKit，仅开发调试用 Mock
- **微信支付**：W3 暂不接入，保持免费；V1.0 再接入支付
- **登录方式（2026-08-07 修订）**：种子内测使用 **邮箱 + 密码**（注册/登录），不再依赖短信验证码
- **种子用户**：5人以内的熟人小圈子，要求**持有 iPhone（iOS 14+）**，风险可控；远程分发走 **TestFlight**
- **HBuilderX 必要性**：W3 必须安装 HBuilderX，用于 iOS 自定义基座调试 / 云打包正式包（Vite CLI 无法替代）

### W3 暂不做（V1.0 再处理）

- ❌ Android 设备数据同步（Google Fit / 手机厂商健康 App）
- ❌ 微信支付 / 订阅付费
- ❌ 定时推送（微信服务通知）
- ❌ 多 Agent 并发优化
- ❌ 正式对外发布

---

## 📋 W2 回顾与 W3 起点确认

### W2 已完成清单

| 模块 | 状态 | W3 依赖说明 |
|------|------|-----------|
| Morning Brief Agent | ✅ | 接入真实 HealthKit 数据，替换 Mock |
| Query Agent | ✅ | 已有对话能力，接入真实上下文 |
| Workout Agent | ✅ | 已有建议能力，结合真实运动数据 |
| Safety Agent | ✅ | 规则引擎已部署，继续使用 |
| Memory Agent（L1+L2） | ✅ | 直接使用 |
| AI 对话界面 | ✅ | 直接使用；W3 中期已加语音输入/播报 |
| SiliconFlow API | ✅ | DeepSeek-V3 + bge-m3；另用于 SenseVoice / CosyVoice2 |
| Edge Functions 全部部署 | ✅ | 直接使用，新增 HealthKit / speech-* Edge Function |
| health_memories 向量维度 | ✅ | 1024 维已确认（ALTER 执行过） |
| 用户登录（历史：手机号 OTP） | ♻️ | **已改为邮箱+密码**（见「中期变更」） |

### W3 需要新增的模块

```
W3 新增模块：
├── T1  HealthKit 技术调研（uni-app 原生插件方案）
├── T2  uni-app 原生插件开发（iOS HealthKit 桥接）
├── T3  HealthKit 数据同步 Edge Function
├── T4  前端 HealthKit 授权与同步 UI
├── T5  运动记录页面（手动记录 + 查看历史）
├── T6  睡眠记录页面（手动补充）
├── T7  晨间简报反馈机制（采纳/忽略/修改）
├── T8  种子用户内测管理（邀请 + 监控）
├── T9  数据质量检查 + Mock 回退逻辑
├── T10 W3 里程碑验收 + 种子用户反馈汇总
└── T11（中期加分）HOP 助手语音输入 + TTS 播报  ✅ 已完成
```

---

## 📋 W3 任务总览

| 任务编号 | 任务名称 | 优先级 | 预计耗时 | 实际状态 |
|---------|---------|-------|---------|----------|
| W3-T1 | HealthKit 技术调研 | P0 | 3h | ✅ `doc/W3-T1-HealthKit技术调研报告.md` |
| W3-T2 | uni-app 原生插件（iOS HealthKit） | P0 | 8h | ✅ 自研 UTS `health-agent-healthkit` |
| W3-T3 | HealthKit 同步 Edge Function | P0 | 4h | ✅ 已部署 `sync-healthkit` |
| W3-T4 | 前端 HealthKit 授权与同步 UI | P0 | 3h | ✅ `pages/healthkit/authorize.vue` |
| W3-T5 | 运动记录页面（手动 + 历史） | P1 | 5h | ✅ |
| W3-T6 | 睡眠记录页面 | P1 | 4h | ✅ |
| W3-T7 | 晨间简报反馈机制 | P1 | 3h | ✅ 采纳/忽略/修改 |
| W3-T8 | 种子用户内测管理 | P1 | 3h | ♻️ 说明+追踪表已有；**表内用户未填** |
| W3-T9 | 数据质量检查 + Mock 回退 | P2 | 3h | ✅ 首页来源徽标 / hybrid |
| W3-T10 | 里程碑验收 + 反馈汇总 | P0 | 4h | ♻️ 工程项已验收；**正式反馈报告未归档** |
| W3-T11 | HOP 助手语音 | P1 | ~1.5d | ✅ |
| W3-Auth | 登录改为邮箱+密码 | P1 | ~0.5d | ✅ |
| **总计（原计划）** | | | **40h** | |

---

## 🏥 第一阶段：HealthKit 技术调研与接入（Day 15-17）

### 📅 Day 15（2026-07-29 周二）

#### ✅ T1.1 HealthKit 技术调研（3h）


**目标：** 已完成。HealthKit 接入能力已内置于项目，无需额外安装第三方插件。

> **背景**：调研结论（见 `W3-T1-HealthKit技术调研报告.md`）改为**自研 UTS 插件**（方案 D，Cursor 2026-07-29 已完成），完全可控，覆盖 W3 全部 P0 数据类型，无需依赖第三方插件。

**已完成文件清单（Cursor 交付）：**

| 文件 | 作用 | 状态 |
|------|------|------|
| `uni_modules/health-agent-healthkit/utssdk/app-ios/HealthKitBridge.swift` | HealthKit 原生读取（步数/能量/站立/睡眠/心率） | ✅ |
| `uni_modules/health-agent-healthkit/utssdk/app-ios/index.uts` | iOS 导出入口（Promise 封装） | ✅ |
| `uni_modules/health-agent-healthkit/utssdk/app-ios/UTS.entitlements` | HealthKit Capability | ✅ |
| `uni_modules/health-agent-healthkit/utssdk/index.uts` | H5/非 iOS 平台 stub | ✅ |
| `uni_modules/health-agent-healthkit/index.d.ts` | TypeScript 类型定义 | ✅ |
| `uni-app/src/lib/healthkit/index.ts` | 业务适配层（统一 API） | ✅ |
| `manifest.json` | 已配置 `NSHealthShareUsageDescription` / `healthkit: true` | ✅ |

**已导出的前端 API（`src/lib/healthkit/index.ts`）：**

```typescript
import { isAvailable, authorize, fetchToday, syncTodayFromDevice } from '@/lib/healthkit'

// 检查是否可用（仅 iOS 真机）
isAvailable()  // → boolean

// 请求授权
authorize()    // → Promise<boolean>

// 读取今日 HealthKit 数据
fetchToday()   // → Promise<TodayHealthKitPayload>

// 读取并同步到 Supabase（推荐使用这个）
syncTodayFromDevice()  // → Promise<SyncResult>
```



**HealthKit 支持的全部数据类型（已实现）：**

`fetchToday()` 返回数据一览：

| 字段 | 类型 | 说明 |
|------|------|------|
| `steps` | number | 当日累计步数 |
| `activeCalories` | number | 主动消耗能量（kcal） |
| `basalCalories` | number | 基础代谢能量（kcal） |
| `standHours` | number | 站立小时数 |
| `exerciseMinutes` | number | 系统识别的锻炼时间（分钟） |
| `sleep` | object\|null | 睡眠分段（深睡/REM/清醒，iOS 16+） |
| `heartRate` | object\|null | 静息心率 + 平均心率 |
| `workouts` | WorkoutRecord[] | **所有运动记录**（跑步/游泳/羽毛球等） |
| `totalDistance` | number | 所有运动累计距离（米） |

`WorkoutRecord` 单条结构：

```typescript
interface WorkoutRecord {
  id: string
  workoutType: string       // 如 "跑步" / "游泳" / "羽毛球"
  workoutTypeId: number     // Apple HKWorkoutActivityType rawValue
  startDate: string          // ISO datetime
  endDate: string
  duration: number           // 分钟
  calories?: number          // kcal
  distance?: number          // 米
  distanceKm?: number        // 公里
}
```

> **全面运动覆盖**：`HKWorkoutActivityType` 支持 80+ 种运动，常见类型均已覆盖：跑步/步行/骑行/游泳/羽毛球/网球/足球/篮球/瑜伽/普拉提/HIIT/力量训练/舞蹈/划船/攀岩/跳绳/拳击/滑雪/骑马等。全部通过 `HKWorkoutType` 一次性查询。
**HBuilderX 真机调试步骤：**

```
1. HBuilderX 打开 uni-app/ 目录
2. Apple Developer：App ID 勾选 HealthKit，重新生成 Provisioning Profile
3. 运行 → 运行到手机或模拟器 → 制作自定义调试基座（勾选 health-agent-healthkit）
4. 基座打好后，运行到 iOS 真机
5. ⚠️ 真机「健康」App 里需有历史数据，否则读出来可能是 0
```

**验收标准：**
- [x] UTS 插件文件全部创建
- [x] `src/lib/healthkit/index.ts` 编译无报错
- [x] `manifest.json` 已添加 HealthKit privacyDescription
- [x] HBuilderX 自定义基座可正常打包

**下一步：T2.2 — 前端授权页**

#### ✅ T2.2 前端 HealthKit 授权 UI（2h）

**目标：** 用户授权界面 + 同步状态反馈

**AI 提示词（给 Cursor）：**

```
请帮我创建 HOP 的 HealthKit 授权页面（Vue 3 + TypeScript + uni-app）：

页面路径：src/pages/healthkit/authorize.vue

场景：用户首次打开 App，或在「我的 → 数据同步」页面中

功能需求：
1. 授权引导
   - 说明为什么需要 HealthKit 权限（提升 AI 建议准确性）
   - 图示展示会读取哪些数据（步数、睡眠、心率、活动卡路里、站立时长）
   - 强调隐私保护（数据不上传，仅本地处理）

2. 授权按钮
   - 主按钮："授权健康数据"
   - 点击后调用 requestHealthKitAuth()
   - Loading 状态（旋转图标 + "正在请求权限..."）

3. 授权结果
   - 成功：显示"授权成功" + 数据同步状态（今日步数等）
   - 失败/拒绝：显示"授权未完成" + "稍后授权"按钮（跳过）

4. 同步状态
   - 显示最近一次同步时间
   - 手动刷新按钮
   - 异常提示（如 HealthKit 不可用）

技术要求：
- 使用 getTodayHealthData() 获取数据
- 授权后自动触发一次数据同步
- 将同步状态保存到 localStorage（hasHealthKitAuth）

代码提示：
```typescript
import { isAvailable, authorize, syncTodayFromDevice } from '@/lib/healthkit'

async function handleAuthorize() {
  if (!isAvailable()) {
    uni.showToast({ title: '此设备不支持 HealthKit', icon: 'none' })
    return
  }

  try {
    const granted = await authorize()
    if (granted) {
      // 授权成功，同步数据到 Supabase
      await syncTodayFromDevice()
      // 保存授权状态
      uni.setStorageSync('hasHealthKitAuth', true)
      uni.showToast({ title: '授权成功', icon: 'success' })
    }
  } catch (e) {
    uni.showToast({ title: '授权失败，请重试', icon: 'none' })
  }
}
```

**验收标准：**
- [ ] 授权页面 UI 友好，隐私说明清晰
- [ ] iOS 真机授权成功（弹窗出现）
- [ ] 授权状态正确保存

---

#### ✅ T3.1 HealthKit 数据同步 Edge Function（3h）— **已完成**

> **原计划稿标注「用户待做」。实际已落地：** `supabase/functions/sync-healthkit/index.ts` + 迁移 `20260806_w3_sync_healthkit.sql`，并部署到 `zewznptbyhurxaqirzmb`。操作说明见 `doc/W3-T3-sync-healthkit部署说明.md`。  
> 下表 SQL 为当时草稿，**不要重复执行与现网冲突的 CREATE**；以 migrations 目录为准。

**目标：** 将 HealthKit 全面数据写入 Supabase，覆盖/补充 Mock 数据，支持运动记录和基础代谢

**Edge Function：** `supabase/functions/sync-healthkit/index.ts`

**前置数据表（需先执行 SQL）：**

```sql
-- workouts 日志表（记录每条运动）
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  workout_id TEXT NOT NULL,          -- HK workout uuid
  workout_type TEXT NOT NULL,        -- 如 "跑步" / "游泳"
  workout_type_id INTEGER NOT NULL,  -- HKWorkoutActivityType rawValue
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_minutes NUMERIC(5,1) NOT NULL,
  calories INTEGER,
  distance_meters INTEGER,
  distance_km NUMERIC(5,2),
  source TEXT DEFAULT 'healthkit',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, workout_id)
);

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own workout_logs" ON workout_logs FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- daily_summaries 新增字段（需 ALTER）
ALTER TABLE daily_summaries
  ADD COLUMN IF NOT EXISTS basal_calories INTEGER,
  ADD COLUMN IF NOT EXISTS total_workouts INTEGER,
  ADD COLUMN IF NOT EXISTS total_distance_meters INTEGER,
  ADD COLUMN IF NOT EXISTS has_workout BOOLEAN DEFAULT FALSE;
```

**Edge Function 完整代码（基于 SiliconFlow）：**

```typescript
// supabase/functions/sync-healthkit/index.ts
// Deno Edge Function：HealthKit 全面数据同步（iOS → Supabase）
// 支持：步数/能量/基础代谢/站立/睡眠/心率 + 全部运动记录

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WorkoutRecord {
  id: string
  workoutType: string
  workoutTypeId: number
  startDate: string
  endDate: string
  duration: number
  calories?: number
  distance?: number
  distanceKm?: number
}

interface HealthKitPayload {
  date: string
  steps: number
  activeCalories: number
  basalCalories: number
  standHours: number
  exerciseMinutes: number
  sleep?: { totalHours: number; deepSleepHours?: number; remSleepHours?: number; wakeUps?: number }
  heartRate?: { resting: number | null; avg?: number | null }
  workouts: WorkoutRecord[]
  totalDistance: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const payload: HealthKitPayload = await req.json()
  const { date, steps, activeCalories, basalCalories, standHours, exerciseMinutes, sleep, heartRate, workouts, totalDistance } = payload
  const today = date || new Date().toISOString().slice(0, 10)

  // 1. 写入 daily_summaries
  const { error: summaryErr } = await supabase.from('daily_summaries').upsert({
    user_id: user.id,
    date: today,
    steps,
    active_calories: activeCalories,
    basal_calories: basalCalories ?? null,
    stand_hours: standHours,
    exercise_minutes: exerciseMinutes,
    resting_heart_rate: heartRate?.resting ?? null,
    avg_heart_rate: heartRate?.avg ?? null,
    total_workouts: workouts.length,
    total_distance_meters: totalDistance ?? 0,
    has_workout: workouts.length > 0,
    source: 'healthkit',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,date' })

  if (summaryErr) {
    console.error('daily_summaries upsert error:', summaryErr)
    return new Response(JSON.stringify({ error: summaryErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // 2. 写入 sleep_logs（跨日窗口：昨日18:00→今日12:00）
  if (sleep) {
    const { error: sleepErr } = await supabase.from('sleep_logs').upsert({
      user_id: user.id,
      date: today,
      total_sleep_hours: sleep.totalHours,
      deep_sleep_hours: sleep.deepSleepHours ?? null,
      rem_sleep_hours: sleep.remSleepHours ?? null,
      wake_ups: sleep.wakeUps ?? 0,
      source: 'healthkit',
    }, { onConflict: 'user_id,date' })
    if (sleepErr) console.error('sleep_logs upsert error:', sleepErr)
  }

  // 3. 批量写入 workout_logs（每条运动一条记录）
  if (workouts && workouts.length > 0) {
    const workoutRecords = workouts.map(w => ({
      user_id: user.id,
      date: today,
      workout_id: w.id,
      workout_type: w.workoutType,
      workout_type_id: w.workoutTypeId,
      started_at: w.startDate.replace(' ', 'T') + 'Z',
      ended_at: w.endDate.replace(' ', 'T') + 'Z',
      duration_minutes: w.duration,
      calories: w.calories ?? null,
      distance_meters: w.distance ?? null,
      distance_km: w.distanceKm ?? null,
      source: 'healthkit',
    }))

    const { error: workoutErr } = await supabase.from('workout_logs')
      .upsert(workoutRecords, { onConflict: 'user_id,workout_id' })

    if (workoutErr) console.error('workout_logs upsert error:', workoutErr)
  }

  // 4. 记录同步历史
  await supabase.from('sync_logs').insert({
    user_id: user.id,
    date: today,
    source: 'healthkit',
    record_count: 1 + (sleep ? 1 : 0) + workouts.length,
    synced_types: ['daily_summary', sleep ? 'sleep' : null, workouts.length > 0 ? 'workouts' : null].filter(Boolean),
  })

  return new Response(JSON.stringify({
    success: true,
    date: today,
    workouts_count: workouts.length,
    total_distance_m: totalDistance,
    synced_types: ['daily_summaries', sleep ? 'sleep_logs' : null, workouts.length > 0 ? 'workout_logs' : null].filter(Boolean),
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
```

**调用方式（前端）：**

```typescript
import { syncTodayFromDevice } from '@/lib/healthkit'

const data = await syncTodayFromDevice()
// syncTodayFromDevice() 内部自动调用 /functions/v1/sync-healthkit
// 无需手动 fetch
```

**API 路由：** `POST /functions/v1/sync-healthkit`
**认证：** Bearer Token（Supabase Auth）

#### ✅ T5.1 运动记录页面 — 手动记录（3h）

**目标：** 用户可以手动记录运动，补充 HealthKit 可能遗漏的数据

**页面路径：** `src/pages/workout/log.vue`

**功能设计：**

```
页面结构：
├── 顶部：日期选择（默认今天，可选近7天）
├── 快速记录区：
│   ├── 运动类型选择（图标按钮组）
│   │   ├── 🏃 跑步
│   │   ├── 🚶 步行
│   │   ├── 🏋️ 力量训练
│   │   ├── 🧘 瑜伽/拉伸
│   │   ├── 🚴 骑行
│   │   └── ⚡ HIIT
│   ├── 时长（分钟）：数字输入 + 快捷按钮（15/30/45/60）
│   └── 主观疲劳度（1-10滑块）
├── 备注输入（可选）
└── 保存按钮

底部：
├── 历史记录入口（查看今日/近7天记录）
└── AI 训练建议入口（调用 Workout Agent）
```

**AI 提示词（给 Cursor）：**

```
请帮我创建运动记录页面（Vue 3 + TypeScript + uni-app）：

页面路径：src/pages/workout/log.vue

功能：
1. 运动类型选择
   - 6种运动类型（跑步/步行/力量训练/瑜伽/骑行/HIIT）
   - 图标按钮组，选中高亮
   - 默认：无

2. 时长输入
   - 数字输入框 + 快捷按钮（15/30/45/60分钟）
   - 默认：30分钟

3. 主观疲劳度
   - 滑块 1-10
   - 标签：1=很轻松，5=中等，10=精疲力竭
   - 默认：5

4. 保存
   - 调用 supabase.from('workout_logs').insert()
   - source = 'user_logged'
   - 保存成功后显示 Toast + 清空表单

5. 历史记录
   - 点击底部"查看历史"进入 workout/history.vue
   - 显示近7天记录列表

API 调用：
```typescript
const { error } = await supabase.from('workout_logs').insert({
  user_id: userStore.user.id,
  date: new Date().toISOString().split('T')[0],
  workout_type: selectedType,
  duration_minutes: duration,
  perceived_exertion: exertion,
  mood_after: 'normal',  // W4 增加运动后心情记录
  source: 'user_logged',
  notes: notes.value,
})
```

样式：
- 卡片布局
- 运动类型用图标按钮（emoji 或 iconfont）
- 选中状态：绿色边框 + 浅绿背景
- 保存按钮：固定底部，主色，禁用状态灰色
```

**验收标准：**
- [ ] 可选择运动类型
- [ ] 可输入时长和疲劳度
- [ ] 保存到 Supabase 成功
- [ ] 历史记录入口有效

---

#### ✅ T5.2 运动历史页面（2h）

**页面路径：** `src/pages/workout/history.vue`

```
页面结构：
├── 顶部：周视图（本周7天，点击切换）
├── 周汇总卡片：
│   ├── 本周运动次数
│   ├── 本周总时长
│   ├── 最常运动类型
│   └── AI 周报入口（调用 W4 Agent）
├── 每日记录列表：
│   ├── 日期
│   ├── 运动类型 + 时长
│   ├── 疲劳度
│   └── 删除按钮（确认对话框）
└── 底部：添加记录按钮（跳转 log.vue）
```

**验收标准：**
- [ ] 显示近7天运动记录
- [ ] 周汇总数据正确
- [ ] 可删除单条记录

---

### 📅 Day 19（2026-08-02 周六）

#### ✅ T6.1 睡眠记录页面 — 手动补充（2.5h）

**目标：** 当 HealthKit 睡眠数据缺失时，用户可手动补充

**页面路径：** `src/pages/sleep/log.vue`

**功能设计：**

```
页面结构：
├── 顶部：日期选择（默认昨晚）
├── 睡眠时长：
│   ├── 就寝时间（时间选择器）
│   ├── 起床时间（时间选择器）
│   └── 自动计算：睡眠时长 = 起床 - 就寝
├── 睡眠质量（1-5星，或 1-100 分）
├── 夜间醒来次数（0-10，数字输入）
├── 备注（可选）
└── 保存按钮
```

**AI 提示词（给 Cursor）：**

```
请帮我创建睡眠手动记录页面（Vue 3 + TypeScript + uni-app）：

页面路径：src/pages/sleep/log.vue

功能：
1. 日期选择（默认昨天）
2. 就寝时间（time picker，默认 23:00）
3. 起床时间（time picker，默认 07:00）
4. 自动计算睡眠时长（起床 - 就寝）
5. 睡眠质量评分（5星评分，1-5）
6. 夜间醒来次数（0-10）
7. 保存到 sleep_logs（source = 'user_logged'）

技术要求：
- 时间选择使用 uni-app picker 组件
- 睡眠时长自动计算（跨天情况：如 23:00 到次日 07:00）

样式：
- 圆角卡片
- 星评分用 emoji（⭐）或数字滑块
- 保存按钮固定底部
```

**验收标准：**
- [ ] 可选择就寝/起床时间
- [ ] 睡眠时长自动计算
- [ ] 保存到 Supabase

---

#### ✅ T6.2 睡眠历史页面（1.5h）

**页面路径：** `src/pages/sleep/history.vue`

```
页面结构：
├── 顶部：周视图
├── 周汇总卡片：
│   ├── 平均睡眠时长
│   ├── 平均睡眠质量
│   └── 睡眠趋势（↑/↓/→）
├── 每日记录列表：
│   ├── 日期 + 星期
│   ├── 睡眠时长（长条图可视化）
│   ├── 质量星级
│   └── 数据来源标识（📱 HealthKit / ✏️ 手动）
└── 底部：添加记录按钮
```

**验收标准：**
- [ ] 近7天睡眠记录显示
- [ ] 数据来源标识清晰（HealthKit vs 手动）
- [ ] 周平均数据正确

---

### 📅 Day 20（2026-08-03 周日）

#### ✅ T7.1 晨间简报反馈机制（3h）

**目标：** 用户可以对每日简报给出反馈（采纳/忽略/修改），用于优化 AI

**数据模型更新（daily_summaries 表已有字段，只需前端使用）：**

```typescript
// daily_summaries 表的反馈字段（W1 已定义）：
// user_feedback: 'adopted' | 'ignored' | 'modified'
// user_feedback_note: TEXT
```

**前端实现（修改首页简报卡片）：**

```
在首页晨间简报卡片底部添加：

┌─────────────────────────────┐
│  ☀️ 今日晨报                  │
│  恢复分：85/100  💪 适合训练   │
│  今日建议：今天状态不错，可以   │
│  做30分钟有氧运动...           │
│                               │
│  ─────────────────────────  │
│  这条建议对你有帮助吗？        │
│  [👍 采纳] [👎 忽略] [✏️ 修改]  │
└─────────────────────────────┘

- 采纳：记录 adopted，跳过下次同类建议
- 忽略：记录 ignored，降低下次同类建议权重
- 修改：弹出文本框，记录用户修改内容
```

**API 调用：**

```typescript
// 更新简报反馈
async function submitBriefFeedback(userId: string, date: string, feedback: 'adopted' | 'ignored', note?: string) {
  const { error } = await supabase
    .from('daily_summaries')
    .update({
      user_feedback: feedback,
      user_feedback_note: note || null,
    })
    .eq('user_id', userId)
    .eq('date', date)

  return !error
}
```

**AI 提示词（给 Cursor）：**

```
请更新首页（src/pages/index/index.vue）的晨间简报卡片：

新增功能：简报反馈按钮

1. 在简报内容下方添加分隔线
2. 添加反馈按钮组：
   - "👍 采纳"（绿色）
   - "👎 忽略"（灰色）
   - "✏️ 修改"（蓝色，点击弹出输入框）

3. 点击采纳/忽略时：
   - 调用 supabase.from('daily_summaries').update()
   - 更新 user_feedback 字段
   - 显示"感谢反馈"Toast
   - 按钮变为已选中状态（不可重复点击）

4. 点击修改时：
   - 弹出 uni.showModal 输入框
   - 用户输入修改内容
   - 调用 API 保存 user_feedback = 'modified' + user_feedback_note

5. 如果已有反馈记录：
   - 显示已选中的状态（灰色 + 不可点击）
   - 替换按钮文字："已反馈"

样式：
- 按钮组横向排列，均匀分布
- 圆角按钮，边框样式
- 选中状态：背景色变化 + 不可重复点击
```

**验收标准：**
- [ ] 反馈按钮显示正常
- [ ] 点击后可正确保存到 Supabase
- [ ] 已反馈记录不再重复提交

---

## 📋 第三阶段：数据质量与 Mock 回退（Day 21-22）

### 📅 Day 21（2026-08-04 周一）

#### ✅ T9.1 数据质量检查（2h）

**目标：** 实现数据质量评估，决定是否使用真实数据或 Mock 回退

**Edge Function 新增（修改 morning-brief/index.ts 的数据获取逻辑）：**

```typescript
// morning-brief/index.ts 中新增数据质量检查逻辑

interface DataQuality {
  has_steps: boolean
  has_sleep: boolean
  has_calories: boolean
  has_stand_hours: boolean
  quality_score: number  // 0-100，100 = 全真实数据
}

async function assessDataQuality(
  supabase: any,
  userId: string,
  date: string
): Promise<DataQuality> {
  // 查询当日的 sync_logs
  const { data: syncLog } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('sync_date', date)
    .eq('status', 'success')
    .order('synced_at', { ascending: false })
    .limit(1)
    .single()

  // 查询当日的 daily_summaries
  const { data: dailySummary } = await supabase
    .from('daily_summaries')
    .select('steps, active_calories, stand_hours')
    .eq('user_id', userId)
    .eq('date', date)
    .single()

  // 查询当日的 sleep_logs（HealthKit 来源）
  const { data: sleepLog } = await supabase
    .from('sleep_logs')
    .select('total_sleep_hours')
    .eq('user_id', userId)
    .eq('date', date)
    .eq('source', 'healthkit_sync')
    .single()

  const hasSteps = dailySummary?.steps != null && dailySummary.steps > 0
  const hasSleep = sleepLog?.total_sleep_hours != null && sleepLog.total_sleep_hours > 0
  const hasCalories = dailySummary?.active_calories != null && dailySummary.active_calories > 0
  const hasStandHours = dailySummary?.stand_hours != null && dailySummary.stand_hours > 0

  // 质量评分：每项 25 分
  const qualityScore = [hasSteps, hasSleep, hasCalories, hasStandHours]
    .filter(Boolean).length * 25

  return {
    has_steps: hasSteps,
    has_sleep: hasSleep,
    has_calories: hasCalories,
    has_stand_hours: hasStandHours,
    quality_score: qualityScore,
  }
}

// 在 morning-brief 主逻辑中替换数据获取部分：
// const quality = await assessDataQuality(supabase, user_id, today)
// if (quality.quality_score >= 75) {
//   // 使用真实数据
//   healthData = await fetchRealHealthData(supabase, user_id, today)
// } else {
//   // Mock 数据回退，但注明"数据不完整"
//   healthData = await fetchMockData(profile)
//   healthData._data_quality = quality  // 附加质量信息
// }
```

**Mock 数据回退时的 AI Prompt 补充：**

```typescript
// 在 buildBriefPrompt 中增加数据质量说明
let prompt = buildBriefPrompt(profile, healthData, recovery)

// 如果数据质量低，在 prompt 末尾补充：
if (healthData._data_quality && healthData._data_quality.quality_score < 75) {
  prompt += `

⚠️ 注意：今日健康数据未完整同步（质量评分：${healthData._data_quality.quality_score}/100）。
生成建议时请注明"建议仅供参考，数据可能不准确"。
避免过于确定性的表述（如"你今天运动量不足"），改为"如果你今天有运动..."。`
}
```

**验收标准：**
- [ ] 数据质量评分正确计算
- [ ] 质量 < 75 分时使用 Mock 数据
- [ ] AI 简报中体现数据不完整的提示

---

#### ✅ T9.2 Mock 数据与真实数据的无缝切换（1.5h）

**目标：** 用户无感知地完成数据源切换

**前端同步策略：**

```typescript
// src/api/health.ts 新增

export const healthApi = {

  // 获取健康数据（自动选择数据源）
  async getTodayHealthData(): Promise<{
    data: any
    source: 'healthkit' | 'mock'
    quality_score: number
  }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')

    // 1. 先尝试获取真实数据（从 daily_summaries）
    const today = new Date().toISOString().split('T')[0]
    const { data: realData } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    // 2. 查询数据质量
    const { data: syncLog } = await supabase
      .from('sync_logs')
      .select('source, status')
      .eq('user_id', user.id)
      .eq('sync_date', today)
      .eq('status', 'success')
      .single()

    const hasHealthKit = syncLog?.source === 'healthkit'
    const qualityScore = realData?.steps > 0 && realData?.stand_hours > 0 ? 75 : 0

    if (qualityScore >= 75) {
      return {
        data: realData,
        source: 'healthkit',
        quality_score: qualityScore,
      }
    }

    // 3. 回退到 Mock（从 Edge Function）
    const { data: mockData } = await useFetch('/api/mock-health-data', {
      method: 'POST',
      body: { user_id: user.id },
    })

    return {
      data: mockData,
      source: 'mock',
      quality_score: 25,  // Mock 数据质量低
    }
  },
}
```

**验收标准：**
- [ ] HealthKit 数据正常时使用真实数据
- [ ] 无数据时自动回退 Mock，用户无感知
- [ ] 前端显示数据来源标识（真实/模拟）

---

## 📋 第四阶段：种子用户内测（Day 22-27）

### 📅 Day 22（2026-08-05 周二）

#### ✅ T8.1 种子用户内测准备（3h）

**目标：** 准备内测材料，筛选邀请 3-5 名种子用户

**内测准备清单：**

```
📦 内测材料包：
├── 1. 内测说明文档（README）
│   ├── 产品简介（1段话）
│   ├── 核心功能（晨间简报 + 健康问答 + 语音输入/播报）
│   ├── 登录方式（邮箱 + 密码注册/登录）
│   ├── 数据来源说明（HealthKit / Mock）
│   ├── 已知限制（Mock 数据、功能未完成）
│   └── 反馈渠道（微信群/私信/问卷）
│
├── 2. 邀请名单筛选
│   ├── 标准：
│   │   ├── ✅ 有 iPhone（iOS 14+）
│   │   ├── ✅ 有运动/健康习惯（Apple Watch 更好）
│   │   ├── ✅ 愿意尝试新产品
│   │   ├── ✅ 愿意给反馈（不一定是好评）
│   │   └── ❌ 不是核心熟人（避免人情干扰反馈真实性）
│   └── 建议：
│       ├── 1-2 名有运动习惯的朋友
│       ├── 1-2 名关注健康但不太运动的朋友
│       └── 1 名产品/技术背景（能提深层建议）
│
├── 3. iOS 安装包分发（远程用户）
│   ├── ✅ 推荐：TestFlight 内部测试（Apple Developer 付费账号）
│   ├── 备选：Ad Hoc + 安装链接（需收集 UDID）
│   └── ❌ 不要用：微信小程序体验码（无法测 HealthKit）
│
└── 4. 反馈收集工具
    ├── 问卷链接（腾讯问卷/金数据，免费）
    ├── 追踪表：doc/种子用户反馈追踪表_v0.1.md
    └── 反馈问题清单：
        1. 简报内容有没有用？（1-5分）
        2. AI 回答准确吗？
        3. 语音输入/播报好用吗？
        4. 数据从哪里来的？（HealthKit / 你不清楚）
        5. 最想要什么功能？
        6. 最大痛点是什么？
```

**内测说明文档：**

- 已生成：`doc/种子用户内测说明_v0.1.md`（含邮箱登录、语音、HealthKit 步骤）
- 反馈表：`doc/种子用户反馈追踪表_v0.1.md`

**验收标准：**
- [x] 内测说明文档完成
- [ ] 种子用户名单确定（3-5人）
- [ ] TestFlight（或 Ad Hoc）邀请已发出

---

### 📅 Day 23（2026-08-06 周三）

#### ✅ T8.2 种子用户 Onboarding（1.5h）

**目标：** 1 对 1 帮种子用户安装 + 授权 HealthKit

**Onboarding 步骤（给种子用户的操作指引）：**

```
种子用户 Onboarding SOP：

Step 1: 安装 App（5–10 分钟）
- 打开组织者发来的 TestFlight 邀请邮件
- iPhone 安装 TestFlight（如尚未安装）
- 在 TestFlight 中安装 Health On Palm
- 打开 App

Step 2: 注册 / 登录（2 分钟）
- 选择「注册」或「登录」
- 输入邮箱 + 密码（密码至少 6 位）
- 注册成功后进入引导（内测需关闭 Supabase Confirm email）

Step 3: 填写健康档案（3 分钟）
- 运动水平
- 睡眠目标
- 偏好训练时间

Step 4: 授权 HealthKit（5 分钟）
- 进入「授权健康数据」页并允许读取
- 等待同步完成
- ⚠️ 数据用于生成简报与问答上下文；不构成医疗诊断

Step 5: 体验晨间简报（3 分钟）
- 返回首页查看今日简报与数据来源标识
- 对一条建议点击「采纳」或「忽略」

Step 6: 体验健康问答 + 语音（5 分钟）
- 打开「HOP 助手」
- 文字提问，例如：「我最近睡得不好怎么办？」
- （可选）按住「语音」说一句，看是否填入输入框
- （可选）对助手回复点「播放」试听

总时间：约 20–30 分钟
```

**种子用户反馈追踪表（Excel 或 Notion）：**

| 用户 | 设备 | 是否授权HealthKit | 晨间简报有用度 | 问答准确度 | 主要反馈 | Bug报告 |
|------|------|-----------------|--------------|---------|---------|---------|

**验收标准：**
- [ ] 种子用户全部成功安装
- [ ] 至少 2 名用户授权了 HealthKit
- [ ] 有初始反馈记录

---

### 📅 Day 24-26（2026-08-07~09 周四-周六）

#### ✅ T8.3 种子用户日常支持（3天，每天 1h）

**目标：** 每日跟进反馈，及时响应问题

**每日跟进清单：**

```
每日跟进 SOP：

Day 1（安装后）：
- 询问：安装顺利吗？HealthKit 授权了吗？
- 记录：初始反馈
- 常见问题：
  - "没有 HealthKit 数据" → 引导查看手机健康 App 是否有数据
  - "注册/登录失败" → 确认邮箱格式、密码≥6 位；确认 Supabase 已关 Confirm email
  - "AI 不回复" → 查看 Supabase Edge Function 日志
  - "语音不能用" → 确认已授权麦克风；录音按住说满约 1 秒再松手

Day 2-3（使用中）：
- 询问：今天看了简报吗？有用吗？
- 询问：有什么功能想要但没有的？
- 记录：使用频率（是否每天打开）

Day 4-5（深度反馈）：
- 发送反馈问卷
- 收集：简报有用度（1-5分）、问答准确度（1-5分）
- 询问：
  - "你会不会继续用这个产品？"
  - "你会推荐给朋友吗？"
  - "如果这个产品要收费，你觉得多少合适？"
```

**Supabase Dashboard 监控（每天查看）：**

```sql
-- 查看日活跃用户（种子用户期间应有 3-5 条记录）
SELECT
  date(created_at) as date,
  count(distinct user_id) as dau
FROM public.daily_summaries
WHERE created_at >= '2026-08-06'
GROUP BY date(created_at)
ORDER BY date;

-- 查看 AI 调用次数（估算 Token 成本）
SELECT
  date(created_at) as date,
  count(*) as total_calls,
  sum(tokens_in + tokens_out) as total_tokens
FROM public.token_usage_logs
WHERE created_at >= '2026-08-06'
GROUP BY date(created_at);

-- 查看简报反馈分布
SELECT
  user_feedback,
  count(*) as count
FROM public.daily_summaries
WHERE user_feedback IS NOT NULL
  AND created_at >= '2026-08-06'
GROUP BY user_feedback;
```

**验收标准：**
- [ ] 每日跟进记录完整
- [ ] 无阻塞性问题（Bug 及时修复）
- [ ] 收集到至少 10 条具体反馈

---

## 📋 第五阶段：W3 迭代与验收（Day 27-28）

### 📅 Day 27（2026-08-10 周日）

#### ✅ T10.1 种子用户反馈汇总（2h）

**反馈分析报告（给 Cursor 生成）：**

```
文件路径：C:\codes\HealthOnPalm\doc\W3 种子用户测试报告.md

报告结构：

## W3 种子用户测试报告

### 测试概况
- 测试时间：2026-08-06 至 2026-08-09
- 种子用户数：X 人
- HealthKit 授权：X 人
- 累计使用天数：X 天
- AI 调用次数：X 次

### 功能验收结果

| 功能 | 可用率 | 用户满意度 | 主要问题 |
|------|--------|---------|---------|
| 晨间简报 | X% | X/5 | |
| 健康问答 | X% | X/5 | |
| 运动记录 | X% | X/5 | |
| 睡眠记录 | X% | X/5 | |
| HealthKit 同步 | X% | X/5 | |

### 反馈摘录（原始用户反馈，匿名化）

1. [正面反馈]
2. [中性反馈]
3. [负面反馈]

### 发现的问题

#### 阻塞性问题（P0）
| 问题 | 描述 | 状态 |
|------|------|------|
| ... | | Fixed/Open |

#### 体验问题（P1）
| 问题 | 描述 | 建议修改 |
|------|------|---------|
| ... | | |

### 迭代建议

#### 必须修复（V1.0 前）
1. ...
2. ...

#### 应有功能（V1.0）
1. ...
2. ...

#### 锦上添花（V1.x）
1. ...
```

**验收标准：**
- [ ] 反馈报告完成
- [ ] 有具体数据支撑（使用率、满意度）
- [ ] 问题清单优先级清晰

---

### 📅 Day 28（2026-08-11 周一）

#### ✅ T10.2 W3 Bug 修复（2h）

| Bug ID | 描述 | 优先级 | 状态 |
|--------|------|-------|------|
| BUG-W3-001 | HealthKit 首次授权后数据未同步 | High | |
| BUG-W3-002 | 手动记录保存后页面未刷新 | Medium | |
| BUG-W3-003 | Mock 数据与真实数据切换时 UI 闪烁 | Low | |
| ... | | | |

---

#### ✅ T10.3 W3 里程碑验收（2h）

**W3 验收标准：**

| 功能 | 验收条件 | 状态（现行） |
|------|---------|--------------|
| HealthKit 同步 | 授权后可把当日数据写到 Supabase | ✅ 真机已通（W3 以授权页手动刷新为主；自动同步见 W4） |
| 数据质量评估 | 无数据时回退 Mock / 标明来源 | ✅ |
| 手动运动记录 | 可记录 + 保存 + 历史 | ✅ |
| 手动睡眠记录 | 可记录 + 保存 + 历史 | ✅ |
| 简报反馈 | 采纳/忽略/修改功能正常 | ✅ |
| 邮箱登录 | 可用邮箱注册并登录（无需短信） | ✅ |
| 语音输入 | 按住说话可转写并填入输入框 | ✅ |
| 语音播报 | 助手回复可播放/停止 | ✅ |
| 种子用户体验 | 3-5 名用户经 TestFlight 完成首次体验 | ♻️ 开发者 TestFlight 已通；多人表未归档 |
| 种子用户反馈 | 收集到 ≥10 条有效反馈 | ❌ 仓库内追踪表仍空 |
| 反馈报告 | 报告包含数据、问题清单、迭代建议 | ❌ 未形成正式报告文件 |

---

## 📊 W3 里程碑验收清单

> 勾选 = **工程与开发者真机**（2026-08-24）。种子运营项单独标注。

### 必须完成（P0）

- [x] HealthKit 数据同步（iOS 真机测试通过）
- [x] 数据质量评估 + Mock 回退逻辑
- [x] 手动运动/睡眠记录 UI 完成
- [x] 晨间简报反馈机制
- [x] 邮箱 + 密码注册/登录（替代短信验证码）
- [x] HOP 助手语音输入 + TTS 播报
- [ ] 3-5名种子用户经 TestFlight 完成首次体验 — **开发者已通；多人未在追踪表归档**
- [ ] 种子用户反馈报告完成 — **未归档**

### 可选完成（P1）

- [x] 运动历史周视图 + 汇总统计
- [x] 睡眠历史周视图 + 趋势分析
- [ ] 种子用户每日使用监控（DAU/调用量）
- [x] 数据来源标识（真实/模拟）
- [x] 语音体验（按住说话、权限与失败提示）— 可持续打磨

### W3 暂不做（当时写 V1.0）

- ❌ Android 设备数据同步 — **至今未做**
- ❌ AI 睡眠分析（Sleep Insight Agent）— **至今未做**
- ❌ AI 周报生成（Weekly Review Agent）— **至今未做**
- ❌ 微信支付 / 订阅付费 — **至今未做**
- ❌ 定时推送（微信服务通知）— **至今未做**
- ❌ 正式对外发布 — **至今未做**

---

## 📊 W3 成本监控

**预期 LLM 成本（W3，5名种子用户，14天）：**

| 功能 | 日调用/用户 | 用户数 | 日Token估算 | 月成本估算 |
|------|------------|-------|-----------|---------|
| Morning Brief | 1 | 5 | ~10,000 | ¥5 |
| Query Agent | 3 | 5 | ~12,000 | ¥6 |
| Safety Check | 4 | 5 | ~3,000 | ¥1.5 |
| Memory 摘要 | 0.5 | 5 | ~2,500 | ¥1 |
| 语音 STT/TTS | ~2 | 5 | （按次计费，量小） | ~¥2–5 |
| **总计** | ~10.5 | 5 | **~27,500+/日** | **~¥16–20/月** |

> ✅ 仍远低于 ¥200/月预算。**已取消短信 OTP 成本**。SiliconFlow 免费额度可覆盖种子测试期绝大部分 LLM/语音调用。

---

## 📅 W4 预览

> **2026-08-23 修订**：W3 结束后实际执行的不是本节预告的 V1.0 线，而是训练闭环、心情、恢复分、首页缓存与 HealthKit 扩展。完整记录见 **`doc/W4 详细执行记录_产品闭环与体验增强.md`**。原预告项顺延 W5。

W3 完成时曾预告 W4 聚焦 **V1.0 正式版**（当时未执行）：

```
W4 任务预览（历史预告，未按此执行）：
├── AI 睡眠分析 Agent（Sleep Insight Agent）
├── AI 周报生成（Weekly Review Agent）
├── 微信支付订阅体系接入（Pro 会员）
├── 种子用户 → 公开测试（扩大范围）
└── V1.0 发布准备（审核材料 + 运营策略）
```

---

## 🛠️ W3 开发工具

| 工具 | 用途 | 获取/关键操作 |
|------|------|------------|
| **HBuilderX App版** | iOS 云打包/自定义基座（HealthKit 必需） | https://www.dcloud.io/hbuilderx.html（非VSCode版） |
| Xcode / Transporter | 上传 ipa 到 App Store Connect | App Store 免费下载 |
| TestFlight | 远程种子用户安装与更新 | App Store Connect → TestFlight |
| iPhone 真机 | HealthKit 测试（唯一验收路径） | iOS 14+，手机健康 App 有历史数据 |
| Apple Developer（付费） | HealthKit + 分发证书 + TestFlight | https://developer.apple.com |
| health-agent-healthkit | 自研 UTS 插件（已完成） | uni_modules/health-agent-healthkit |
| Supabase Dashboard | Auth（Email）+ Edge Function 日志 + Storage | Dashboard |
| 腾讯问卷 | 种子用户反馈收集 | https://wj.qq.com（免费） |

> ⚠️ **HBuilderX 必须下载 App 版**。Vite CLI 的 `dev:h5` 无法验证 HealthKit。  
> 开发调试：HBuilderX → 自定义基座 → iPhone；种子分发：云打包 App Store 包 → TestFlight。
## 📚 W3 参考资料

| 类型 | 内容 |
|------|------|
| HealthKit 文档 | https://developer.apple.com/documentation/healthkit |
| uni-app UTS 插件 | https://uniapp.dcloud.net.cn/plugin/uts-plugin.html |
| uni-app 原生插件 | https://nativesupport.dcloud.net.cn/README |
| dcloud 插件市场 | https://ext.dcloud.net.cn/?search=healthkit |
| Apple Health App | 手机自带「健康」App（iOS） |
| 微信小程序 | **无法**测 HealthKit；W3 未作为交付端 |

---

*文档版本：v1.2（2026-08-24 按实际运行修订）*  
*创建日期：2026-07-29*  
*预计执行：2026-07-29 至 2026-08-11*  
*前置依赖：W2 全部完成*  
*后续实际迭代：`doc/W4 详细执行记录_产品闭环与体验增强.md`*
