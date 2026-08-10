# W3-T1 HealthKit 技术调研报告

> **项目**：HOP  
> **阶段**：W3 第三阶段（真实健康数据接入）  
> **日期**：2026-07-29  
> **调研范围**：DCloud 插件市场 + uni-app UTS 原生插件 + 自研方案  
> **关联文档**：[W3 详细执行计划](./W3%20详细执行计划_MVP第三阶段.md) T1.1

---

## 1. 调研背景与目标

W2 已完成 AI 对话、晨间简报、Safety Agent 等能力，但健康数据仍来自 `mock-health-data` Edge Function。W3 的核心转变是：

| 维度 | W2 | W3 |
|------|----|----|
| 数据来源 | Mock 模拟 | **HealthKit 真实数据（iOS）** |
| 同步策略 | 无 | **按需同步**（打开 App 时读取当日数据） |
| 补充录入 | 无 | 运动/睡眠手动记录 |

本报告目标：

1. 调研 DCloud 插件市场中 HealthKit / 健康数据相关插件（≥3 个）
2. 对比功能完整性、维护状态、价格、与 HOP 的匹配度
3. 给出 **推荐技术方案** 与 **实施步骤**
4. 列出风险与注意事项

---

## 2. 关键前提（平台能力边界）

在选型前必须明确 **uni-app 各端对健康数据的访问能力**：

| 运行端 | HealthKit | 说明 |
|--------|-----------|------|
| **iOS App（app-plus）** | ✅ 完整支持 | W3 真机验证、种子用户内测的主路径 |
| **H5** | ❌ 不支持 | 浏览器无法访问系统健康数据，继续 Mock + 手动录入 |
| **微信小程序** | ❌ 不支持 HealthKit | 仅可通过 **微信运动（WeRun）** 获取加密步数，需服务端解密 |
| **Android App** | ⚠️ 厂商差异大 | W3 暂不做（V1.0 再评估华为 Health Service Kit） |

> **重要澄清**：W3 文档写「iOS 微信小程序为主」，但 **微信小程序无法直接读取 HealthKit**。  
> 实际可行组合为：
> - **iOS 原生 App**：完整 HealthKit（W3 P0）
> - **微信小程序**：WeRun 步数（可选 P2）+ Mock/手动补充
> - **H5 开发调试**：Mock，不能替代 iOS 真机验收

当前项目 `uni-app/` 使用 **Vue 3 + Vite CLI**，尚未配置 `app-plus` iOS 打包；W3 需增加 **HBuilderX 云打包 / 自定义基座** 流程。

---

## 3. MVP 所需 HealthKit 数据类型

来自 W3 计划与技术设计文档，按优先级：

| 优先级 | 数据 | HealthKit Identifier | 用途 |
|--------|------|---------------------|------|
| P0 | 步数 | `HKQuantityTypeIdentifierStepCount` | 今日数据、恢复分 |
| P0 | 活动能量 | `HKQuantityTypeIdentifierActiveEnergyBurned` | 今日数据、简报 |
| P0 | 站立时长 | `HKCategoryTypeIdentifierAppleStandHour` | 活动时长估算 |
| P0 | 睡眠分析 | `HKCategoryTypeIdentifierSleepAnalysis` | 睡眠时长、恢复分 |
| P0 | 静息心率 | `HKQuantityTypeIdentifierRestingHeartRate` | 恢复分、简报 |
| P1 | 锻炼分钟 | `HKQuantityTypeIdentifierAppleExerciseTime` | 活动时长 |
| P1 | HRV | `HKQuantityTypeIdentifierHeartRateVariabilitySDNN` | 恢复分增强 |
| P2 | 步行距离 | `HKQuantityTypeIdentifierDistanceWalkingRunning` | 趋势分析 |

**W3 明确不做**：Background Delivery 后台推送同步（改为 App 前台按需读取当日 00:00→现在）。

---

## 4. DCloud 插件市场调研

### 4.0 如何在插件市场找到它

很多开发者搜 **`szy-healthkit` 或 `HealthKit` 搜不到**，原因是：

| 你搜的关键词 | 市场实际展示名 | 结果 |
|-------------|---------------|------|
| `szy-healthkit` | ❌ 列表标题不含此词 | 搜不到 |
| `HealthKit` | ⚠️ 结果很杂，不一定排第一 | 容易漏 |
| **`健康数据管理`** | ✅ 插件正式标题 | **推荐** |
| 插件 ID **`28023`** | ✅ 直达 | **最可靠** |

**推荐安装方式（三选一）**

1. **浏览器直达（最稳）**  
   打开：https://ext.dcloud.net.cn/plugin?id=28023  
   点击「使用 HBuilderX 导入插件」或下载 zip

2. **HBuilderX 内**  
   菜单 → 工具 → 插件安装 → 搜索 **「健康数据管理」**（不要搜 szy-healthkit）  
   或：右键项目 → 从插件市场导入 → 粘贴 URL `https://ext.dcloud.net.cn/plugin?id=28023`

3. **手动放置**  
   下载后解压到 `uni-app/uni_modules/szy-healthkit/`（**文件夹名**才是 szy-healthkit）

**若仍找不到 / 无法导入**：改用下方 **方案 B（wrs-uts-health，id:20504）** 或 **方案 D（自研 UTS）**。

---

### 4.1 候选插件总览

| # | 插件名 | 市场 ID | 类型 | 最近更新 | 价格 | Vue3 | iOS 睡眠 | 静息心率 | 活动能量 | 站立 | 读写 | 维护评价 |
|---|--------|---------|------|----------|------|------|----------|----------|----------|------|------|----------|
| 1 | **健康数据管理**（目录名 szy-healthkit） | [28023](https://ext.dcloud.net.cn/plugin?id=28023) | UTS | **2026-07-27** | **MIT 免费** | ✅ app-vue | ✅ | ✅ | ✅ | ⚠️ 需 statistics | ✅ | ⭐⭐⭐⭐⭐ 活跃 |
| 2 | **wrs-uts-health** 增删查健康数据 | [20504](https://ext.dcloud.net.cn/plugin?id=20504) | UTS | 2025-12-27 | **需私聊作者** | ✅ | ✅ 含阶段 | ✅ | ✅ | ⚠️ | ✅ 增删查 | ⭐⭐⭐⭐ 较活跃 |
| 3 | **saner-Health** 健康信息 | [16398](https://ext.dcloud.net.cn/plugin?id=16398) | 原生插件 | 2024-03-23 | **付费** | 旧模式 | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ⭐⭐ 更新慢 |
| 4 | **KJ-Health** 查询健康数据 | [10728](https://ext.dcloud.net.cn/plugin?id=10728) | 原生插件 | 2023-11-24 | **付费** | 旧模式 | ✅ | ✅ | ✅ | ❌ | 读为主 | ⭐⭐ 偏旧 |
| 5 | **zhongyan-walk** 步数插件 | [26085](https://ext.dcloud.net.cn/plugin?id=26085) | UTS | 2025-12-07 | **MIT 免费** | ✅ | ❌ | ❌ | ❌ | ❌ | 只读步数 | ⭐⭐ 功能单一 |

> 注：DCloud 市场页面多数不公开标价；原生插件（16398、10728）标注需购买绑定项目，不支持离线打包。

---

### 4.2 插件详细分析

#### 方案 A：`健康数据管理` / `szy-healthkit`（推荐 ⭐）

- **市场标题**：健康数据管理（iOS + Android + HarmonyOS）  
- **uni_modules 目录名**：`szy-healthkit`（导入后才会看到此文件夹名）  
- **链接**：https://ext.dcloud.net.cn/plugin?id=28023  
- **架构**：UTS 插件，ES Module 导入（**不用** `uni.requireNativePlugin`）  
- **许可**：MIT，个人开发者可用  
- **跨端**：iOS HealthKit + Android 传感器 + 鸿蒙 + **7 种小程序 WeRun 步数**

**优势**

- 与 W3 MVP 数据类型覆盖最高（17+ iOS 类型）
- 文档完善：HealthKit entitlements、Provisioning Profile、诊断 API
- 2026-07 仍在更新，兼容 uni-app 5.0
- 提供 `getTodaySteps()`、`getTodayActiveEnergy()`、`querySamples('sleep')` 等高层 API
- 小程序端 WeRun 可作为 **微信端步数降级方案**

**劣势 / 待验证**

- `AppleStandHour` / `RestingHeartRate` 需用 `queryStatistics` / `querySamples` 自行封装（非一键 API）
- iOS 真机 + 云打包 Profile 必须开启 HealthKit Capability
- UTS 插件需 **HBuilderX 自定义基座** 调试，纯 `npm run dev:h5` 无法验证

**示例调用**

```typescript
import {
  requestAuthorization,
  getTodaySteps,
  getTodayActiveEnergy,
  querySamples,
  getHealthKitDiagnostics,
} from '@/uni_modules/szy-healthkit'

const auth = await requestAuthorization(
  ['steps', 'heartRate', 'activeEnergy', 'sleep'],
  [] // MVP 只读
)
if (auth !== 'SUCCESS') {
  console.warn(getHealthKitDiagnostics())
  return
}

const steps = await getTodaySteps()
const calories = await getTodayActiveEnergy()
const sleepSamples = await querySamples('sleep', startISO, endISO, 50)
```

---

#### 方案 B：`wrs-uts-health`（20504，备选）

- **链接**：https://ext.dcloud.net.cn/plugin?id=20504  
- **架构**：UTS，`import { UTSHealth } from '@/uni_modules/wrs-uts-health'`  
- **平台**：iOS + 华为 Health Service Kit + 鸿蒙运动健康（Android 侧）

**优势**

- iOS 类型枚举最全之一：`sleepAnalysis`、`restingHeartRate`、`activeEnergyBurned` 等均有文档
- 支持 **增删查**，睡眠分期（Core/Deep/REM）有说明
- 2025-12 仍在更新

**劣势**

- 集成需 **私聊作者 / 进入交流群**（商业插件，非开源）
- 需拷贝 `nativeResources`、`Info.plist` 等到项目根目录，集成成本高于 szy-healthkit
- 华为/鸿蒙配置复杂，W3 非必需

---

#### 方案 C：原生插件 `saner-Health` / `KJ-Health`（不推荐 MVP）

- 使用 `uni.requireNativePlugin('saner-Health')` 旧模式
- **必须 HBuilderX 云打包 + 购买插件**，不支持 Vite CLI 离线打包
- API 偏底层（时间戳 + HK 原始 Identifier），开发效率低
- 最近更新 2023–2024，iOS 17+ 兼容性需自行验证

---

#### 方案 D：自研 UTS 插件（W3 计划方案 B）

- 在 `uni-app/uni_modules/health-agent-healthkit/` 自研 Swift HealthKit 桥接
- 完全可控，仅实现 MVP 需要的 5–6 种数据类型
- **预估工时**：8h+（含 Xcode Capability、授权 UI、真机调试）
- 适合：市场插件无法满足 `AppleStandHour` / 静息心率统计逻辑，或需深度定制

---

## 5. 技术方案对比矩阵

| 评估维度 | A. szy-healthkit | B. wrs-uts-health | C. 原生付费插件 | D. 自研 UTS |
|----------|------------------|-------------------|-----------------|-------------|
| **开发速度** | ⭐⭐⭐⭐⭐ 1–2 天 | ⭐⭐⭐ 2–3 天 | ⭐⭐ 3–4 天 | ⭐ 5–8 天 |
| **MVP 数据覆盖** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐（按实现） |
| **成本** | 免费 MIT | 商业（未知） | ¥数百/插件 | 仅人力 |
| **Vue3 + Vite 兼容** | ✅ UTS | ✅ UTS | ⚠️ 需 HBuilderX | ✅ UTS |
| **文档/社区** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | — |
| **小程序降级** | ✅ WeRun | ❌ | ❌ | ❌ |
| **长期维护** | 作者活跃 | 作者活跃 | 风险较高 | 团队自维护 |
| **App Store 审核** | 需隐私说明 | 同左 | 同左 | 同左 |

---

## 6. 推荐方案

### 🏆 决策（2026-07-29 更新）：**方案 D — 自研 UTS 插件 `health-agent-healthkit`**

> **变更原因**：HBuilderX 插件市场第三方包（如「健康数据管理」）在真机调试与版本兼容上不够稳定；HOP 仅需 MVP P0 读取能力，自研 UTS 可控性更高、无市场依赖。

**理由**

1. **完全可控**：Swift + UTS 混合实现，只实现 MVP 需要的 6 类读取，无多余 API  
2. **无第三方风险**：不依赖插件作者更新、商业授权或市场下架  
3. **与 HBuilderX 工作流一致**：`uni_modules/health-agent-healthkit`，自定义基座云打包  
4. **薄封装层已就绪**：`src/lib/healthkit/index.ts` 统一 `authorize()` / `fetchToday()` / `toSyncPayload()`  
5. **H5/小程序降级清晰**：非 iOS App 返回 `available: false`，继续 Mock + 手动录入  

**实施位置**

```
uni-app/uni_modules/health-agent-healthkit/
├── utssdk/app-ios/HealthKitBridge.swift   # HealthKit 原生查询
├── utssdk/app-ios/index.uts               # UTS 导出入口
├── utssdk/app-ios/UTS.entitlements        # HealthKit Capability
└── index.d.ts                             # Vue 项目 TS 类型

uni-app/src/lib/healthkit/index.ts         # 业务适配层
```

**PoC 验收标准**（T2.1）

- iOS 真机授权弹窗正常  
- 能读到步数 / 睡眠 / 静息心率（健康 App 有历史数据）  
- `getHealthKitDiagnostics()` 可用于排错  

---

## 7. 推荐架构

```
┌─────────────────────────────────────────────────────────┐
│  uni-app 前端                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ iOS App      │  │ 微信小程序    │  │ H5 开发调试    │  │
│  │ 自研 UTS     │  │ Mock/手动    │  │ Mock          │  │
│  │ healthkit    │  │              │  │               │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                 │                   │          │
│         └────────┬────────┴───────────────────┘          │
│                  ▼                                       │
│         src/lib/healthkit/index.ts  ← 统一数据模型      │
└──────────────────────────┬──────────────────────────────┘
                           ▼
              POST /functions/v1/sync-healthkit
                           ▼
              Supabase daily_summaries / sleep_logs / workout_logs
                           ▼
              morning-brief / recovery-score（替换 mock-health-data）
```

### 7.1 统一适配层（建议新建）

```typescript
// src/lib/healthkit/types.ts
export interface TodayHealthKitPayload {
  source: 'healthkit' | 'mock' | 'manual' | 'werun'
  date: string // YYYY-MM-DD
  steps: number | null
  activeCalories: number | null
  standHours: number | null
  sleep: {
    totalHours: number
    deepSleepHours?: number
    remSleepHours?: number
    qualityScore?: number
  } | null
  heartRate: {
    resting: number | null
    avg?: number | null
  } | null
  workoutMinutes: number | null
}
```

### 7.2 同步策略（W3 MVP）

| 决策点 | W3 选择 |
|--------|---------|
| 同步时机 | App `onShow` + 用户点击「同步健康数据」 |
| 数据范围 | 当日 00:00 → 当前时间 |
| 存储 | 写入 Supabase，`sync_logs` 记录 source=healthkit |
| 失败回退 | 保留 mock-health-data + 手动录入（T9） |

---

## 8. 实施步骤（W3 T2–T4）

### Step 1：环境准备（0.5 天）

1. 安装 **HBuilderX**（iOS 云打包 / 自定义基座）
2. Apple Developer：App ID 勾选 **HealthKit** Capability
3. 重新生成含 HealthKit 的 **Provisioning Profile**
4. `manifest.json` 增加：
   - `NSHealthShareUsageDescription`
   - `NSHealthUpdateUsageDescription`（若只读可写最小描述）
   - iOS Capabilities → HealthKit

### Step 2：集成自研 UTS 插件（1–2 天）

1. 插件已在 `uni-app/uni_modules/health-agent-healthkit/`（无需从市场导入）
2. HBuilderX：**制作自定义调试基座**，勾选 `health-agent-healthkit`
3. 使用 `src/lib/healthkit/index.ts`：
   - `isAvailable()`
   - `authorize()`
   - `fetchToday()` / `syncTodayFromDevice()`
4. 新建授权页 `pages/healthkit/authorize.vue`（W3 T2.2）

### Step 3：Edge Function `sync-healthkit`（1 天）

- 接收 `TodayHealthKitPayload`，upsert `daily_summaries` / `sleep_logs`
- `morning-brief` 优先读真实数据，无数据时 fallback mock

### Step 4：iOS 真机验收（0.5 天）

- iPhone 14+ 真机，健康 App 中有历史数据
- 验证：授权 → 同步 → 首页指标更新 → 晨报使用真实步数/睡眠

---

## 9. 潜在风险与注意事项

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| **HealthKit 授权 0.0s 失败** | 高 | 检查 Profile HealthKit entitlement；调用 `getHealthKitDiagnostics()` |
| **H5/小程序无法测 HealthKit** | 高 | W3 验收必须在 iOS App 真机，不能仅用 `dev:h5` |
| **HealthKit 读授权状态不可信** | 中 | Apple 设计：读权限无明确 denied，以能否读到数据为准 |
| **睡眠数据跨日** | 中 | 睡眠查询用「昨日 18:00 → 今日 12:00」窗口，写入 `sleep_logs.date` |
| **站立小时统计** | 中 | 用 `AppleStandHour` category 样本计数 × 1h，PoC 首日验证 |
| **App Store 审核** | 中 | 隐私政策说明用途；HealthKit 仅用于健康建议，不做广告 |
| **插件作者停更** | 低 | 已选自研 UTS，无第三方停更风险 |

---

## 10. 技术方案决策记录（ADR）

| 项目 | 决策 |
|------|------|
| **HealthKit 接入方式** | **自研 UTS**：`uni_modules/health-agent-healthkit` |
| **第三方插件** | 不采用（市场插件稳定性不足） |
| **同步模式** | 按需同步（非 Background Delivery） |
| **数据范围** | 当日数据 |
| **微信小程序** | W3 不接入 HealthKit；Mock/手动录入 |
| **Android** | W3 不做；手动录入补充 |
| **Mock 回退** | 保留，作为 T9 数据质量保障 |

---

## 11. W3 后续任务映射

| W3 任务 | 本报告结论 |
|---------|-----------|
| T1.1 技术调研 | ✅ 本文档 |
| T2.1 插件初始化 | ✅ 自研 `health-agent-healthkit` + manifest 配置 |
| T2.2 授权 UI | 调用 `authorize()` |
| T3.1 sync-healthkit | 适配层 → Edge Function |
| T4 前端同步 UI | 首页/档案页增加同步状态 |
| T9 Mock 回退 | H5/未授权/iOS 不可用时的降级 |

---

## 12. 参考资料

- [W3 详细执行计划](./W3%20详细执行计划_MVP第三阶段.md)
- [HOP 技术设计文档 v2.0 — HealthKit 章节](./Health%20Agent%20技术设计文档%20v2.0_OPC版.md)
- [szy-healthkit 插件](https://ext.dcloud.net.cn/plugin?id=28023)
- [wrs-uts-health 插件](https://ext.dcloud.net.cn/plugin?id=20504)
- [Apple HealthKit 文档](https://developer.apple.com/documentation/healthkit)
- [uni-app UTS 插件](https://uniapp.dcloud.net.cn/plugin/uts-plugin.html)
- [DCloud 插件市场 HealthKit 搜索](https://ext.dcloud.net.cn/?search=HealthKit)

---

**结论**：W3 HealthKit 接入采用 **自研 UTS 插件 `health-agent-healthkit` + `src/lib/healthkit` 适配层 + `sync-healthkit` Edge Function**。下一步进入 **T2.1 iOS 真机 PoC**（HBuilderX 自定义基座 + 授权页）。
