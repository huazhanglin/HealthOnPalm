# health-agent-healthkit

Health On Palm **自研** iOS HealthKit UTS 插件，不依赖 DCloud 插件市场第三方包。

## 支持数据（MVP P0）

| 数据 | HealthKit 类型 |
|------|----------------|
| 步数 | `HKQuantityTypeIdentifierStepCount` |
| 活动能量 | `HKQuantityTypeIdentifierActiveEnergyBurned` |
| 站立小时 | `HKCategoryTypeIdentifierAppleStandHour` |
| 睡眠 | `HKCategoryTypeIdentifierSleepAnalysis` |
| 静息心率 | `HKQuantityTypeIdentifierRestingHeartRate` |
| 锻炼分钟 | `HKQuantityTypeIdentifierAppleExerciseTime` |

## HBuilderX 配置清单

1. **manifest.json**（已在项目中配置）
   - `NSHealthShareUsageDescription`
   - `NSHealthUpdateUsageDescription`（只读场景可写最小描述）

2. **Apple Developer**
   - App ID 勾选 **HealthKit** Capability
   - 重新生成含 HealthKit 的 Provisioning Profile

3. **真机调试**
   - 运行 → 运行到手机或模拟器 → **iOS 真机**
   - 首次需「制作自定义调试基座」（`src/uni_modules` 下的本地 UTS 插件会自动编入，无需手动勾选）

4. **不支持的平台**
   - H5 / 微信小程序：调用会返回 `available: false`，请走 Mock + 手动录入

## 使用

```typescript
import {
  isHealthKitAvailable,
  requestHealthKitAuthorization,
  fetchTodayHealthKitData,
} from '@/uni_modules/health-agent-healthkit'

if (isHealthKitAvailable()) {
  const auth = await requestHealthKitAuthorization()
  if (auth === 'SUCCESS') {
    const data = await fetchTodayHealthKitData()
    console.log(data.steps, data.sleep)
  }
}
```

或统一封装：

```typescript
import { authorize, fetchToday, isAvailable } from '@/lib/healthkit'
```

## 目录结构

```
src/uni_modules/health-agent-healthkit/
├── package.json
├── index.d.ts              # TS 类型（Vue 项目）
├── utssdk/
│   ├── interface.uts       # 接口声明
│   └── app-ios/
│       ├── index.uts       # iOS 导出入口
│       ├── config.json
│       ├── UTS.entitlements
│       └── HealthKitBridge.swift # Swift 混编（同目录下 index.uts 无需 import）
```
