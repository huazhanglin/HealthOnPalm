# Health on Palm (HOP / 掌握健康) — W6 详细执行计划（App Store 上架冲刺）

> **阶段目标**：把当前冻结版做成可送审的 **1.0.0**，完成 App Store 首次提交  
> **时间范围**：约 10–14 个日历日（建议 2026-09-02 起；OPC 日均 2–4 小时）  
> **验收标准**：商店包在 TestFlight 自测通过；App Store Connect 材料齐；已点 Submit for Review  
> **适用客户端**：iOS App（HBuilderX 云打包 App Store 包 + Transporter / Xcode）  
> **文档版本**：v1.1  
> **编写日期**：2026-09-02  
> **当前冻结**：`uni-app/src/manifest.json` **0.3.9 / versionCode 139**；代码已在 GitHub `main`（`c740ad0`）  
> **官方名称**：英文 **Health on Palm**，缩写 **HOP**，中文 **掌握健康**（桌面图标与中文商店名用「掌握健康」）

---

## 📋 品牌名称（本周对外一律按此）

| 场景 | 用这个 |
|------|--------|
| 英文 / 代码常量 `APP_NAME` | Health on Palm |
| 缩写 | HOP |
| 中文 / 桌面图标 / 中文 App Store 名称 | 掌握健康 |
| 首次出现时可写全称 | Health on Palm（HOP / 掌握健康） |

历史文档里的「掌上健康」「Health On Palm」视为旧称，**不必本周全文替换**；新材料不要再用。

---

## 📋 与 W5「W6 预览」的差异（先对齐口径）

W5 文末曾把原生 tabBar、种子扩面、Sleep Insight、Weekly Review、血压、支付、上架材料一并列为 W6 候选。

**W6 实际只做上架。** 原因：上架缺的是合规与材料，不是新功能；把新 Agent / 支付绑进首发，审核面会变大、被拒成本更高。

| W5 预告的 W6 | W6 实际 | 说明 |
|--------------|---------|------|
| 过程：代码入库 GitHub | ✅ **已完成**（2026-09-01，`13263c5..c740ad0`） | 不占用本周工时 |
| 原生 `tabBar` + `switchTab` | ✅ **已在 0.3.9 完成** | 不重复做 |
| 训练计划组数/次数 + 无图占位 | ✅ **已在 `c740ad0` 完成** | 不重复做 |
| 种子扩面 / 反馈表归档 | ♻️ **本周只做「商店同款包」小范围自测** | 3–5 人公开内测可顺延 W7 |
| Sleep Insight / Weekly Review | ❌ **本周不做** | 上架后再开 |
| 血压等新指标 | ❌ **本周不做** | 仍避开临床病历 |
| 微信支付 / 订阅 | ❌ **本周不做** | 免费首发，避免 IAP 审核 |
| Web 管理后台 | ❌ **本周不做** | — |
| **App Store 审核材料 + 隐私 + 注销** | ✅ **本周主线** | 见下方任务 |

---

## 📋 W6 定位

### 现在能上架的产品面（不要再加功能）

| 能力 | 状态 |
|------|------|
| 邮箱 + 密码注册 / 登录 | ✅ 有；文案仍像内测 |
| 新手引导 + 健康档案 | ✅ |
| HealthKit 只读同步（活动 / 睡眠 / 心率等） | ✅ |
| 晨间简报 + 恢复分 + 反馈 | ✅ |
| 今日训练计划（含组数/次数或时长）+ 打卡 | ✅ |
| 运动 / 睡眠 / 心情记录 | ✅ |
| HOP 助手（文字 + 语音） | ✅ |
| 原生五 Tab | ✅ |
| 隐私政策（可打开的页面 + 公网 URL） | ❌ 登录页仍 toast「开发中」 |
| App 内删除账号 | ❌ 「我的」没有入口 |
| 商店截图 / 描述 / 隐私营养标签 | ❌ |

### 本周原则

1. **不新开 Agent、不接支付、不扩 HealthKit 类型。**  
2. **建议保守、非医疗**：商店文案与隐私政策都写「生活方式建议，不替代医生」。  
3. **先过审核，再谈增长。** 种子扩面用商店同款包即可，不必等审核通过。  
4. 法律文本下列提纲**不能替代律师审阅**；个体开发者可先按提纲上线，后续再请人过一遍。

---

## 📋 任务总览

| 编号 | 任务 | 优先级 | 预估 | 依赖 |
|------|------|--------|------|------|
| W6-T1 | 隐私政策 + 用户协议正文，并放到公网 HTTPS | P0 | 0.5–1 天 | — |
| W6-T2 | App 内打开隐私政策 / 用户协议（登录页 + 我的） | P0 | 0.5 天 | T1 |
| W6-T3 | 「我的」增加账号与隐私区 + **删除账号** | P0 | 1–1.5 天 | T1 |
| W6-T4 | 去掉内测文案，版本升为 **1.0.0** | P0 | 0.5 天 | 可与 T2 并行 |
| W6-T5 | App Store Connect 产品页（描述、关键词、分类、年龄） | P0 | 0.5 天 | T4 |
| W6-T6 | App Privacy 营养标签 | P0 | 0.5 天 | T1 |
| W6-T7 | 商店截图（6.7" + 6.1"） | P0 | 0.5–1 天 | 1.0.0 包或当前真机 |
| W6-T8 | 审核备注 + 审核员测试账号 | P0 | 0.5 天 | T3（账号可用） |
| W6-T9 | 云打包 App Store ipa → 上传 → TestFlight 冒烟 | P0 | 0.5–1 天 | T2–T4 合入 |
| W6-T10 | Submit for Review | P0 | 0.5 天 | T5–T9 |
| W6-T11 | （可选）2–3 人装商店同款 TestFlight | P1 | 穿插 | T9 |

**建议日历（OPC）**

| 日 | 做完 |
|----|------|
| D1 | T1 正文定稿并上线公网 URL |
| D2 | T2 + T4 |
| D3–D4 | T3 注销（前端 + 后端删除） |
| D5 | T5 + T6 + T8 草稿 |
| D6 | T7 截图；T9 打 1.0.0 包并上传 |
| D7 | TestFlight 冒烟；补材料；T10 提交 |
| 缓冲 2–5 天 | 等审核 / 按拒信改 |

---

## 一、W6-T1 隐私政策与用户协议（公网）

### 目标

App Store Connect **Privacy Policy URL** 必须是审核员 Safari 能打开的 HTTPS 页面（不能只做 App 内页，也不能用未渲染的 raw markdown）。

### 托管建议（选一个，越简单越好）

1. **GitHub Pages**（推荐）：本仓库 `docs/legal/` 放 `privacy.html` + `terms.html`，Pages 开 `docs/`。  
2. 个人已有的独立站 / 文档站。  
3. 不要用网盘、不要用登录墙、不要用仅 App 内 WebView。

示例 URL（以实际 Pages 域名为准）：

- 隐私政策：`https://huazhanglin.github.io/HealthOnPalm/legal/privacy.html`  
- 用户协议：`https://huazhanglin.github.io/HealthOnPalm/legal/terms.html`

页脚写：**生效日期、版本号（如 1.0.0）、开发者名称、联系邮箱。**

本周已填入：

| 项 | 值 |
|----|----|
| 开发者 | Steven Lin |
| 联系邮箱 | huazhang.lin@gmail.com |
| 正文位置 | `docs/legal/privacy.html`、`docs/legal/terms.html` |
| 计划公网地址 | `https://huazhanglin.github.io/HealthOnPalm/legal/privacy.html` |
| | `https://huazhanglin.github.io/HealthOnPalm/legal/terms.html` |

**开启 GitHub Pages（发布后审核员才能打开）：** 仓库需为 **Public** → Settings → Pages → Source 选 `main` 的 `/docs` 文件夹。约 1 分钟后用手机 Safari 验证无登录墙。

### 隐私政策必须写的段落（按此结构成文）

下列每节都要有，审核和用户都可能抽查。方括号内是本产品应写进的事实，不要写「我们可能收集一切」。

**1. 引言与适用**

- 产品名：Health on Palm（HOP），中文名「掌握健康」。  
- 谁提供服务（个人开发者姓名或主体名）。  
- 适用范围：iOS App；不覆盖未上线的微信小程序。  
- **本 App 不是医疗器械，不提供诊断、处方或治疗方案。**

**2. 我们处理的信息（分类列举）**

| 类别 | 写清楚 |
|------|--------|
| 账号 | 邮箱、密码哈希（由 Supabase Auth 处理，我们不存明文密码） |
| 档案 | 昵称、年龄、性别、身高、体重、职业（可选）、睡眠目标、运动偏好、头像 |
| Apple 健康（HealthKit，**只读**） | 活动（步数、距离、活动热量、基础代谢、锻炼分钟、站立）、睡眠分期、心率与心率变异、血氧、呼吸频率、体能相关指标、手机中的训练记录。**不写入**健康 App。**不读取**临床病历、处方、实验室结果 |
| 你在 App 内记录的 | 运动打卡、手动睡眠、心情、晨报反馈 |
| 对话 | 你发送给 HOP 助手的文字；语音会先转成文字再用于问答 |
| 技术信息 | 设备类型、App 版本、大致用于排错的日志；**不做广告追踪 ID**（当前 `uniStatistics` 关闭） |

**3. HealthKit 专节（单独一节，不要埋在表格里）**

- 用途：生成恢复分、晨间简报、训练计划与助手上下文。  
- 授权可在系统「健康」App 中随时关闭。  
- **不向广告平台提供 HealthKit 数据；不出售健康数据。**  
- 关闭授权后，App 不再新同步；已同步到服务器的历史需通过「删除账号」清除（见第 8 节）。

**4. 我们如何使用**

- 提供登录、档案、简报、训练计划、记录、助手。  
- 改进稳定性（崩溃与错误日志，尽量脱敏）。  
- **不用于画像广告、不用于向保险公司或雇主提供数据。**

**5. 第三方（点名）**

| 第三方 | 角色 | 用户应知道的 |
|--------|------|----------------|
| Apple | 系统、HealthKit、App Store | 按 Apple 隐私政策 |
| Supabase | 账号、数据库、Edge Function 托管 | 邮箱与业务数据存在其云上 |
| 大模型 / 语音服务（SiliconFlow 等） | 简报、训练计划、问答、语音识别与播报 | 会发送**与问题相关的健康摘要或对话文本**，用于生成回复；提示词要求不诊断、不开药 |

写明：第三方按合同/其政策处理；我们要求其不得将健康数据用于广告。

**6. 存储地点与期限**

- 服务器区域（按 Supabase 项目实际区域填写，例如海外节点则写「可能跨境」）。  
- 账号存续期间保留；删除账号后在合理期限内（建议写 **30 天内**）从生产库删除或匿名化，备份按备份周期覆盖。

**7. 未成年人**

- 本 App 面向成人。不向 13 岁以下（若上架中国区可写 14 岁以下）提供服务。若发现误注册，删除该账号。

**8. 你的权利 / 删除账号**

- 可在 App「我的 → 账号与隐私 → 删除账号」申请删除。  
- 删除范围：账号、档案、健康同步记录、运动/睡眠/心情、对话与计划缓存。  
- **不能替你撤销系统里的 HealthKit 授权**，需用户自己到「设置 → 健康」关闭。  
- 联系邮箱（与商店 Support URL 同一邮箱）。

**9. 安全**

- 传输 HTTPS；账号密码由认证服务哈希；最小权限访问 HealthKit。  
- 不承诺绝对安全。

**10. 政策变更**

- 重大变更会更新页面日期；必要时在 App 内提示。继续使用视为知悉（不要写得像强迫放弃权利）。

**11. 联系我们**

- 邮箱（必填）。可选：GitHub Issues 仅作技术反馈，隐私请求走邮箱。

### 用户协议（条款）建议段落（可短于隐私政策）

1. 服务说明：个人健康与生活方式建议工具。  
2. **免责：非医疗建议，不适请咨询医生；紧急情况拨打当地急救电话。**  
3. 账号与安全：邮箱注册，对密码保密负责。  
4. 可接受使用：禁止利用助手寻求处方、剂量、攻击性利用。  
5. 知识产权：App 与文案；动作库改编自 wger.de（CC BY-SA），应用内保留署名。  
6. 服务变更与终止；删除账号。  
7. 适用法律（按开发者所在地填写）。  
8. 联系方式。

### 验收

- [ ] 两个 URL 无登录墙，手机 Safari 可打开  
- [ ] 含 HealthKit 专节、第三方点名、删除账号路径  
- [ ] 页脚有生效日期与联系邮箱  

---

## 二、W6-T2 App 内展示隐私政策 / 用户协议

### 目标

登录页与「我的」都能打开完整文本；审核员抽查登录页链接不能再出现「开发中」。

### 改什么

| 位置 | 现状 | 改为 |
|------|------|------|
| `pages/login/index.vue` `openPrivacy()` | `uni.showToast('隐私政策页面开发中')` | 分别打开《用户协议》《隐私政策》 |
| 登录页 hint | 「内测账号请使用常用邮箱…」 | 见 T4 |
| 「我的」 | 无入口 | 见 T3 账号与隐私区 |

**实现偏好（选一，保持简单）**

- **A（推荐）**：`pages/legal/privacy`、`pages/legal/terms` 用 `web-view` 加载 T1 的 HTTPS；无网时展示简短离线摘要 + 「请联网查看全文」。  
- **B**：把 HTML/Markdown 打进包内本地页。公网 URL 仍必须存在（给商店）。

登录页两个链接不要绑到同一个函数。

### 验收

- [ ] 未登录：点《隐私政策》《用户协议》能看到正文  
- [ ] 已登录：「我的」同样能打开  
- [ ] 不再出现「开发中」toast  

---

## 三、W6-T3 删除账号（放在「我的」哪里）

### 为什么必须做

Guideline **5.1.1(v)**：支持注册的 App 必须在 App **内**提供删除账号，且**好找**。只做「发邮件给我们删」不够。

### 放在「我的」的位置（按此改 UI，不要藏进多层设置）

当前 `pages/profile/index.vue` 顺序是：基本信息 → 健康档案 → 运动偏好 → **数据同步** → 保存档案 → **退出登录**。

**改为：**

```
基本信息
健康档案
运动偏好
数据同步          ← 保持，仍进 HealthKit 授权页

账号与隐私        ← 新增一块卡片（在「保存档案」上方）
  隐私政策     ›
  用户协议     ›

保存档案          ← 主按钮，绿色，只保存档案
退出登录          ← 次按钮，保持现有样式

删除账号          ← 最底部，独立文字按钮，红色/灰色弱样式
                     不要和「保存档案」并排，避免误触
```

导航栏标题可仍为「我的档案」。审核员从 Tab「我的」进入后，**滑到页底就能看到删除账号**。

不要：只放在 Web 隐私政策里；不要藏在「连续点版本号 7 次」；不要只在登录前提供。

### 删除流程（产品）

1. 点「删除账号」。  
2. 弹窗说明：**不可恢复**；将删除云端档案、同步记录、运动/睡眠/心情、对话；HealthKit 授权需自己去系统设置关闭。  
3. 二次确认：输入 `DELETE` 或勾选「我了解后果」+ 再点「确认删除」。  
4. 成功后登出并回到登录页。  
5. 失败 toast，可引导发邮件（与隐私政策同一邮箱）。

### 后端（本周必须有真实删除，不能只清本地）

现状：仓库里**没有**删用户的 Edge Function / 级联删除入口。需要新增，例如：

- `supabase/functions/delete-account`：校验 JWT，用 service role 删该 `user_id` 在 `users`、`daily_summaries`、`workout_logs`、`sleep_logs`、心情、对话等表中的行，再删 `auth.users`。  
- 表上已有 `ON DELETE CASCADE` 的跟 `users` 走；没有的在函数里显式删。  
- **不要**从客户端用 anon key 调 service role。

前端：`src/lib` 或 `src/api` 封装 `deleteAccount()`，页面只调封装（健康数据删除逻辑不写在 Vue 里拼 SQL）。

### 验收

- [ ] 「我的」页底可见「删除账号」  
- [ ] 二次确认后，该邮箱无法再登入旧数据  
- [ ] Dashboard 中该用户业务表行被清或已级联删除  
- [ ] 删除后本地 session / 缓存清空  

---

## 四、W6-T4 去内测文案 + 版本 1.0.0

### 文案

| 文件 | 改前 | 改后方向 |
|------|------|----------|
| `pages/login/index.vue` 表单 hint | 内测账号、Supabase Confirm email | 「使用常用邮箱注册。密码至少 6 位。」 |
| 种子说明类文档 | 可保留「内测」 | **不要进 ipa** |
| 助手 / 简报 | 已有非医疗措辞则保持 | 不要新加强疗效承诺 |

### 版本

`manifest.json`：

- `versionName`：`1.0.0`  
- `versionCode`：`140`（必须大于 139，否则无法覆盖 TestFlight 旧包）

商店首发用 1.0.0，避免审核员把 0.3.9 当成未完成测试版。

### 验收

- [ ] ipa 与 Connect 上 Build 显示 1.0.0 (140)  
- [ ] 登录页无「内测」「Confirm email」  

---

## 五、W6-T5 App Store Connect 产品页

### 基本信息

| 字段 | 建议 |
|------|------|
| 名称（中文区） | 掌握健康 |
| 名称（英文区） | Health on Palm |
| 副标题（30 字内） | 见下方草稿 |
| 类别 | **主：健康与健身 Health & Fitness**；次：生活方式。**不要选医疗 Medical** |
| 内容版权 | 含改编自 wger 的动作说明，在审核备注里提 CC BY-SA |
| 年龄分级 | 按问卷填；无色情暴力时通常 4+ 或 12+（以问卷结果为准） |
| 价格 | 免费；本周**无内购** |
| 隐私政策 URL | T1 公网地址 |
| 技术支持 URL | 可为 GitHub 仓库 Issues 页，或一页「如何联系」的 GitHub Pages |
| 销售范围 | 可先全球；**中国区文案避免诊疗承诺**（描述已按此写） |

加密合规：仅 HTTPS，勾选 **不符合出口合规例外以外的加密**（即标准「仅使用 HTTPS」路径）。

### 商店描述草稿（中文，可直接贴）

**副标题（≤30 字）**

```
每日恢复参考与训练建议
```

**宣传文本（≤170 字，可随时改、不随版本审）**

```
根据你在 Apple「健康」中的活动与睡眠，给出当天的恢复参考、可执行的训练安排，以及保守的生活方式建议。HOP 不是医生，也不提供诊断或用药指导。
```

**描述**

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

**关键词（100 字符内，逗号分隔，不要重复 App 名）**

```
健康,健身,睡眠,恢复,训练计划,步数,心率,Apple健康,生活方式
```

### 英文稿（可选本地化，建议一起交，方便美区审核员）

**Subtitle**

```
Daily recovery and training guidance
```

**Description**

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

### 验收

- [ ] Connect 中文描述已粘贴；隐私政策 URL 可打开  
- [ ] 分类为健康与健身，非医疗  
- [ ] 无「治愈 / 降血压药 / 替代就诊」等表述  

---

## 六、W6-T6 App Privacy 营养标签

在 App Store Connect → App 隐私，按**实际收集**勾选。不要少勾健康数据（审核会对照 HealthKit usage string）。

| 数据类型 | 用途 | 关联用户 | 用于追踪 |
|----------|------|----------|----------|
| 邮箱 | 账号 | 是 | 否 |
| 健康与健身（HealthKit 及 App 内记录） | App 功能 | 是 | **否** |
| 其他用户内容（对话、反馈） | App 功能 | 是 | 否 |
| 产品交互 / 崩溃诊断（若有） | 分析或功能 | 尽量不关联 | 否 |

声明：

- 健康数据 **不用于第三方广告**。  
- 无 ATT 追踪则不要勾「用于追踪」。

与 T1 隐私政策保持一致。

### 验收

- [ ] 营养标签已发布（或随版本提交）  
- [ ] HealthKit 相关类型已声明  

---

## 七、W6-T7 截图

至少：

- iPhone **6.7"**（如 15 Pro Max）一组  
- iPhone **6.1"**（如 15 / 16）一组  

建议 5 张，顺序：

1. 首页晨报 + 恢复分（有真实或混合数据标识即可）  
2. 今日训练计划（能看到组数 × 次数）  
3. HOP 助手对话  
4. 记录（运动/睡眠/心情入口）  
5. 健康授权或「我的」档案（体现 HealthKit 已连接）  

不要：医疗十字、心电图诊断风、保证疗效的大字。可用系统状态栏。中文 App 用中文 UI。

### 验收

- [ ] 两套尺寸已上传  
- [ ] 图上无「内测」「DEBUG」  

---

## 八、W6-T8 审核备注与测试账号

### 审核员账号

准备专用邮箱（不要用你日常开发号）：

- 邮箱 / 密码写进 Review Notes  
- 预先完成引导、授权过 HealthKit（审核员设备上仍可能再弹系统授权）  
- 种子数据：至少有一天步数或手动记录，避免空白简报被当成坏掉  

若审核员不肯授权 HealthKit：备注写明「拒绝授权仍可手动记录运动/睡眠/心情并使用助手；简报会提示数据不足」。

### Review Notes 草稿（英文为主，审核员常用）

```
Health on Palm (HOP / 掌握健康) is a lifestyle wellness app (not a medical device).
It reads Apple Health (HealthKit) data read-only to generate conservative recovery-oriented tips and a workout plan. It does not write to HealthKit, does not diagnose, and does not prescribe.

Demo account:
Email: [审核专用邮箱]
Password: [密码]

Path: Sign in → (onboarding if needed) → Home briefing → Workout tab → Chat tab.
Grant HealthKit read access when prompted. Account deletion: Profile tab → scroll to bottom → Delete Account.

Microphone: optional, for voice chat.
No third-party social login; Sign in with Apple is not required (email/password only).
Exercise library adapted from wger.de (CC BY-SA); attribution shown in the workout plan.
```

### 验收

- [ ] Notes 中有账号、HealthKit 说明、注销路径  
- [ ] 用该账号在 TestFlight 包走过一遍  

---

## 九、W6-T9 打包、上传、TestFlight 冒烟

### 证书（沿用 W4 规则）

| 用途 | 证书 |
|------|------|
| USB 自定义基座 | **开发**证书 |
| TestFlight / 上架 | **Distribution** + App Store profile |

### 步骤

1. HBuilderX 云打包：iOS → App Store，版本 1.0.0 (140)。  
2. Transporter 或 Xcode 上传。  
3. Connect 里选该 build，提交 TestFlight 内部测试。  
4. **用商店同款包**（不要用自定义基座）走一遍：

   - 新装 → 注册 → 引导 → 授权健康 → 首页 → 训练（组数可见）→ 助手一句 → 记录一条 → 打开隐私政策 → **不要在主号上试删除**（用审核小号试注销）

### 验收

- [ ] TestFlight 1.0.0 可安装  
- [ ] 冒烟清单无阻断级问题  

---

## 十、W6-T10 提交审核

1. 版本 1.0.0 关联 build。  
2. 广告标识：无 ATT 则选不请求追踪。  
3. 内容权属、出口合规已填。  
4. Submit for Review。  
5. 拒信按条款改：常见是隐私 URL、注销不好找、健康数据声明不全、看起来像未完成产品。改完再提，不必加新功能。

### 验收

- [ ] 状态为 Waiting for Review 或 In Review  
- [ ] 本周文档勾选与 Connect 一致  

---

## 十一、W6-T11（P1）商店同款包小范围体验

不挡提交。2–3 个熟人装 **TestFlight 1.0.0**，记录机型 / iOS / 是否授权 HealthKit。反馈可写入 `doc/种子用户反馈追踪表_v0.1.md`。  
**不要**把未过审的商店链接公开传播。

---

## 📊 W6 验收清单（相对本阶段目标）

### P0 必须

- [ ] 公网隐私政策 + 用户协议  
- [ ] App 内可打开全文（登录页不再「开发中」）  
- [ ] 「我的」页底可删除账号，服务端真正删除  
- [ ] 1.0.0 (140)，无内测文案  
- [ ] Connect 描述 / 截图 / 营养标签 / 审核备注 + 测试号  
- [ ] TestFlight 商店包冒烟通过  
- [ ] 已 Submit  

### P1 可选

- [ ] 英文产品页  
- [ ] 2–3 人 TestFlight 反馈归档  

### 本周明确不做

- ❌ 新 Agent（睡眠洞察 / 周报）  
- ❌ 血压等临床向指标  
- ❌ 支付 / 会员  
- ❌ Sign in with Apple（仅邮箱登录则不必）  
- ❌ 新开 Android / 微信小程序上架  

---

## 📅 审核通过之后（W7 候选，不列入本周范围）

- 按拒信或用户反馈打 1.0.1  
- 再考虑种子扩面、Sleep Insight、周报  
- 支付与增长在 **免费 1.0 稳定之后**

---

## 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-09-02 | 首版：上架冲刺；与 W5 预告的「大而全 W6」对齐为「只做商店」 |
| v1.1 | 2026-09-02 | 官方名称定为 Health on Palm / HOP / 掌握健康；商店稿与桌面图标名对齐 |

---

*文档性质：执行计划（尚未开工）*  
*前置：0.3.9 功能冻结已入库 GitHub*  
*后续：以审核结果与 `doc/W5 详细执行记录_计划对照与对外讲述.md` 中未做的产品债为 W7 输入*
