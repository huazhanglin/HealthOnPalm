# W6-T5 App Store Connect 填写稿

把下面各段**原样粘贴**到 App Store Connect。我这边无法登录你的 Apple 开发者账号，Connect 里的点击需要你完成。

版本：1.0.0（Build 140）  
产品：掌握健康 / Health on Palm（HOP）  
日期：2026-09-02

---

## 0. 打开位置

App Store Connect → 你的 App → **1.0.0** 版本页，以及左侧 **App 信息 / 价格与销售范围 / App 隐私**。

还没有 App 记录时：我的 App → 添加 → iOS，套装 ID 与 HBuilderX / 证书里的 Bundle ID 必须一致。

---

## 1. 基本信息

| 字段 | 填这个 |
|------|--------|
| 中文（简体）名称 | `掌握健康` |
| 英文名称 | `Health on Palm` |
| 主类别 | **健康与健身**（Health & Fitness） |
| 次类别 | 生活方式（Lifestyle） |
| 不要选 | **医疗 Medical** |
| 价格 | 免费 |
| 内购 | 无 |
| 销售范围 | 可先全球 |
| 内容版权 | 含改编自 wger.de 的动作说明（CC BY-SA），详见审核备注 |

**隐私政策 URL**（必须 HTTPS，审核会点开）

```
https://huazhanglin.github.io/HealthOnPalm/legal/privacy.html
```

**技术支持 URL**

```
https://huazhanglin.github.io/HealthOnPalm/support.html
```

若 GitHub Pages 还没打开：先把仓库设为 Public，Settings → Pages → `main` + `/docs`。临时支持页可用：

```
https://github.com/huazhanglin/HealthOnPalm/issues
```

隐私政策不能用 Issues 代替。Pages 未上线就不要点 Submit。

**出口合规 / 加密**：仅使用 HTTPS。按问卷选「使用加密，但仅限于豁免范围内」（标准 HTTPS 路径），不要声称实现了自研加密算法。

---

## 2. 简体中文产品页（必填）

### 副标题（11 / 30 字）

```
每日恢复参考与训练建议
```

### 宣传文本（74 / 170 字，可随时改、不随版本审）

```
根据你在 Apple「健康」中的活动与睡眠，给出当天的恢复参考、可执行的训练安排，以及保守的生活方式建议。HOP 不是医生，也不提供诊断或用药指导。
```

### 描述

```
掌握健康（Health on Palm，HOP）是一款个人健康助手，帮助你把手机里已有的健康数据，变成当天用得上的建议。

你可以：
• 授权读取 Apple「健康」中的活动、睡眠、心率等（只读，不写入）
• 查看晨间简报与恢复参考，并对建议给出反馈
• 获取今日训练计划（含动作图示与建议组数/次数或时长）并打卡
• 手动记录运动、睡眠与心情，补全「健康」里没有的部分
• 用文字或语音向 HOP 提问，获得一般性的生活方式建议

HOP 基于你提供的数据与公开健康知识，建议保持保守、可执行。它不能替代执业医师的诊断、处方或治疗方案。若指标异常、持续不适或出现紧急症状，请及时就医或拨打当地急救电话。

训练动作说明改编自开源项目 wger.de，遵循 CC BY-SA，应用内保留署名。

需要 Apple「健康」授权才能同步真实数据；你可随时在系统设置中关闭授权。支持在「我的」中删除账号。
```

### 关键词（35 / 100 字符，不要出现 App 名）

```
健康,健身,睡眠,恢复,训练计划,步数,心率,Apple健康,生活方式
```

新词不要加「诊断、处方、治疗、医疗、降压、治愈」。

---

## 3. 英文产品页（建议一起交，方便美区审核员）

### Subtitle（29 / 30）

```
Daily recovery & workout plan
```

### Promotional Text（158 / 170）

```
Turns Apple Health data into a daily recovery snapshot, workout plan, and conservative lifestyle tips. HOP is not a doctor and does not diagnose or prescribe.
```

### Description

```
Health on Palm (HOP, Chinese name 掌握健康) turns the activity and sleep data already on your iPhone into conservative, actionable lifestyle guidance.

• Read Apple Health data (read-only): activity, sleep, heart rate, and related metrics
• Morning briefing and a recovery-oriented summary
• A daily workout plan with suggested sets and reps (or duration) and check-in
• Manual logs for workouts, sleep, and mood
• Chat or voice with HOP for general wellness questions

HOP is not a medical device and does not diagnose, prescribe, or treat any condition. If you feel unwell or have urgent symptoms, contact a clinician or emergency services.

Exercise descriptions are adapted from wger.de (CC BY-SA) with attribution in the app. You can delete your account in Profile.
```

### Keywords

```
health,fitness,sleep,recovery,workout,steps,wellness,lifestyle,heartrate
```

---

## 4. 年龄分级问卷（按实际勾，不要猜「看起来专业」）

无色情、暴力、赌博、无限制网页、无烟草酒精交易时，常见结果是 **4+** 或 **12+**（以问卷为准）。建议口径：

| 问题方向 | 建议 |
|----------|------|
| 色情 / 暴力 / 枪支 / 赌博 | 无 |
| 不适宜竞赛、用户生成的不良内容 | 无或极轻度（对话是健康问答，有安全过滤） |
| 医疗或治疗信息 | **无**（本 App 只给生活方式建议，不当成诊疗信息） |
| 无限制网页访问 | 无 |

不要为了「显得像健康产品」去勾医疗治疗信息。

---

## 5. 你在 Connect 里还要做、但本文件不代替的

- 上传截图：见计划 **W6-T7**（6.7" + 6.1" 各一组）
- App 隐私营养标签：见下一节，建议今天一并勾
- 审核备注与测试账号：见 **W6-T8**（测试号密码不要写进本仓库）

---

## 附录：W6-T6 App 隐私（同一天勾完）

路径：App Store Connect → App 隐私 → 编辑。按**实际收集**勾，不要少勾健康数据。

| 数据类型 | 用途 | 关联到身份 | 用于追踪 |
|----------|------|------------|----------|
| 邮箱地址 | App 功能（账号） | 是 | 否 |
| 健康与健身 | App 功能（HealthKit 只读 + 运动/睡眠/心情记录） | 是 | **否** |
| 其他用户内容 | App 功能（助手对话、简报反馈） | 是 | 否 |
| 产品交互 / 崩溃 | 若未接统计 SDK、未接崩溃平台 | **不要勾**；有再勾「分析」，尽量不关联身份 | 否 |

声明要点：

- 健康数据**不用于广告**、不出售、不用于追踪
- 无 ATT / 无广告标识则不要勾「用于追踪」
- 与隐私政策一致：HealthKit 只读，不写入「健康」App

勾完后点 **发布**（或随 1.0.0 提交一起生效，按 Connect 当前界面为准）。
