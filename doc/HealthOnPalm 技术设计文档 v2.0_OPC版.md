# Health On Palm 技术设计文档 v2.0
## Personal HOP — OPC 超级个体版

> **文档版本**：v2.0（OPC 专版）
> **编写目的**：替代原"传统团队版"技术设计文档，基于"1人 + 多智能体"研发模式重写
> **适用阶段**：MVP 开发（4周）/ V1.0（8周）
> **核心技术栈**：Supabase + LangGraph + 微信小程序 + DeepSeek/Qwen
> **运营成本目标**：月均 ¥750 以内
> **与《可行性研究报告 v5.0》的关系**：本文档是技术执行层，核心选型与可行性报告保持完全一致

---

## 变更日志

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| v1.0 | 2026-07-22 | 传统团队版（已废弃） |
| v2.0 | 2026-07-23 | OPC 超级个体版，基于"1人 + 多智能体"研发模式重写 |
| v2.0-amend | 2026-08-07 | **实现层修订（不改全文）**：客户端主路径为 uni-app iOS App；Auth 为邮箱+密码；HOP 助手支持语音 STT/TTS（SiliconFlow）；种子分发走 TestFlight。细节见 `W3 详细执行计划_MVP第三阶段.md`「中期变更」。 |

---

## 第一章 架构概览

### 1.1 架构设计哲学

OPC 模式下的架构设计遵循三个核心原则：

**原则一：先跑通，再优化。**
MVP 阶段不追求架构完美，追求"最小闭环"。能用 Supabase 一体化解决的，不用三个独立服务；能用简单判断解决的，不上复杂规则引擎。

**原则二：成本优先于性能。**
每个技术选型决策前，先问："月均成本会增加多少？"在 ¥750/月 预算约束下，架构的可扩展性必须让步于可负担性。

**原则三：自己能维护。**
你是唯一的开发者。任何需要持续运维的组件（如 Kubernetes、自建向量数据库）一律不用。

### 1.2 系统架构图（MVP）

```
┌─────────────────────────────────────────────────────────────┐
│                        用户层                                │
│           微信小程序  /  H5（微信内嵌）                       │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS (REST API)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                       Supabase 平台                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ PostgreSQL   │  │    Auth      │  │  Edge Functions  │   │
│  │ (业务数据)    │  │  (登录鉴权)   │  │  (轻量后端逻辑)   │   │
│  ├──────────────┤  └──────────────┘  └──────────────────┘   │
│  │ pgvector    │                                          │
│  │ (向量记忆)   │                                          │
│  └──────────────┘                                          │
└────────────────────────────┬────────────────────────────────┘
                             │
               ┌─────────────┼─────────────┐
               ▼             ▼             ▼
        ┌───────────┐ ┌───────────┐ ┌───────────────┐
        │  DeepSeek │ │   Qwen    │ │    Claude     │
        │   -V3     │ │  -Max     │ │  (复杂推理)    │
        │ (主力模型) │ │  (降级1)  │ │   (降级2)     │
        └───────────┘ └───────────┘ └───────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                      工具层 (Tools)                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │
│  │  HealthKit  │  │  天气 API   │  │  日历 API           │   │
│  │  (iOS)     │  │  (和风/心知) │  │  (系统日历)         │   │
│  └────────────┘  └────────────┘  └────────────────────┘   │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │
│  │ 规则引擎   │  │ 数据校验   │  │  免责声明触发       │   │
│  └────────────┘  └────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**架构说明：**
- 后端逻辑全部运行在 Supabase Edge Functions（Node.js）中，无需独立服务器
- Agent 运行时（LangGraph）也在 Edge Functions 内，支持状态机编排
- 所有数据通过 Supabase REST API（PostgREST）访问，无需手写 CRUD API
- LLM 调用走统一的 Model Gateway，按响应质量自动降级

### 1.3 与 v1.0 的核心差异

| 维度 | v1.0（传统团队版） | v2.0（OPC版） |
|------|------------------|--------------|
| 部署架构 | Kubernetes + Docker | Supabase 云服务（免运维） |
| 数据库 | PostgreSQL + Redis + ClickHouse + ES + VectorDB | Supabase 一体化（PostgreSQL + pgvector） |
| 微服务 | 12+ 个独立 Service | 0，所有逻辑在 Edge Functions |
| CI/CD | GitHub Actions 完整流水线 | Cursor 内置 + Supabase 部署钩子 |
| 文档规范 | ADR + RFC + Runbook + Playbook | 仅 `agent.md`（单文件约定） |
| 安全架构 | KMS + Vault + 审计日志 | Supabase 内置 + Row Level Security |
| 估算容量 | 1000万用户 | MVP 阶段：100-500 用户 |

### 1.4 OPC 模式特有的工程约束

OPC 模式下，以下工程实践在 MVP 阶段**不做**：

```
❌ 不做：微服务拆分（MVP 单体优先）
❌ 不做：自建向量数据库（pgvector 足够）
❌ 不做：Kubernetes 容器编排（Supabase 托管）
❌ 不做：灰度发布/蓝绿部署（直接生产验证）
❌ 不做：自动化端到端测试（人工验收）
❌ 不做：完整的 ADR 文档库（只记录关键决策）
❌ 不做：多云部署（单区域部署）

✅ MVP 必做：
✅ 每日 git 提交 + Cursor Agent 记录
✅ 核心逻辑单测（AI 生成 Test Agent）
✅ 数据备份（Supabase 自动备份）
✅ 错误监控（Supabase 内置）
```

---

## 第二章 技术选型与决策记录

### 2.1 选型总览

| 模块 | 选型 | 替代方案 | 决策理由 |
|------|------|---------|---------|
| **数据库 + 记忆** | Supabase（PostgreSQL + pgvector） | PlanetScale / Neon / 自建 | 一体化：DB + Auth + API + 向量，¥300/月以内 |
| **Agent 框架** | LangGraph | CrewAI / AutoGen / 自研 | 原生支持有状态图 + 人机协同，代码可控 |
| **后端运行时** | Supabase Edge Functions | Cloudflare Workers / Vercel Functions | 与数据库同平台，延迟低，Supabase 平台补贴 |
| **移动端** | 微信小程序 | FlutterFlow / React Native | 微信生态：传播 + 推送 + 支付三位一体 |
| **主力 LLM** | DeepSeek-V3 | Qwen-Max / GLM-4 | 成本极低（¥1/百万Token），中文能力强 |
| **降级 LLM** | Qwen-Max | Claude 3.5 / GPT-4o | 国内可访问，价格适中 |
| **终极降级** | Claude 3.5 Sonnet | GPT-4o | 复杂推理场景兜底 |
| **健康数据源** | Apple HealthKit（iOS）+ Mock | 华为 Health / 小米健康 | MVP 先做 iOS，Android 硬件接入复杂度高 |
| **天气数据** | 和风天气 API | 心知天气 / OpenWeatherMap | 国内稳定，免费额度充足（1000次/天） |
| **代码编辑器** | Cursor | Windsurf / Copilot | 多 Agent 协同开发支持最强 |
| **部署平台** | Supabase + 微信云开发 | Vercel / Railway | 小程序必须连云服务，Supabase 够用 |

### 2.2 ADR（架构决策记录）

#### ADR-001：为什么选择 Supabase 而非自建 PostgreSQL

**背景**：OPC 模式下，运维能力为零，必须依赖云托管数据库。

**决策**：使用 Supabase Cloud。
**替代方案**：Neon（Serverless PostgreSQL）、PlanetScale（MySQL兼容）、自建 PostgreSQL。

**评估**：
```
Supabase 优势：
  ✅ DB + Auth + API + Edge Functions + pgvector 五合一
  ✅ PostgreSQL 完整功能（JSONB、事务、RLS）
  ✅ 免费额度：500MB 数据库 + 1GB 文件存储 + 50万月活跃用户
  ✅ pgvector 内置，向量检索无需额外服务
  ✅ Row Level Security，数据访问控制内置

Supabase 风险：
  ⚠️ 国外服务，国内访问依赖网络（需要测速验证）
  ⚠️ 免费版有并发限制（200并发连接）
  ⚠️ Edge Functions 有执行时间限制（单次50秒）
    → 缓解：复杂 LLM 调用在客户端做，Edge Functions 只做数据存储

结论：MVP 阶段 Supabase 够用，若月成本超过 ¥300 考虑降级到 Neon。
```

#### ADR-002：为什么选择 LangGraph 而非 CrewAI

**背景**：需要编排多个 Agent 的工作流，CrewAI 上手快但定制性差。

**决策**：LangGraph。
**替代方案**：CrewAI、AutoGen、自研状态机。

**评估**：
```
LangGraph 优势：
  ✅ Python 原生，与数据处理层同一语言
  ✅ 有向图建模，Agent 状态和流转清晰
  ✅ 支持"人机协同"（Human-in-the-loop），复杂决策可暂停等用户确认
  ✅ 支持条件分支、循环，适合 HOP 的多轮对话场景
  ✅ 代码即架构，可版本控制

LangGraph 风险：
  ⚠️ 学习曲线比 CrewAI 陡峭
  ⚠️ 需要自己管理 Agent Prompt
  ⚠️ 部署在 Edge Functions 有冷启动问题
    → 缓解：MVP 先用简化版 LangGraph（单 Agent + 工具调用），不急上完整图

结论：LangGraph 是长期正确选择，短期用简化版。
```

#### ADR-003：为什么 MVP 选择微信小程序而非 Flutter / React Native

**背景**：需要快速触达用户，小程序生态完善。

**决策**：微信小程序（H5版优先，方便调试）。

**评估**：
```
微信小程序优势：
  ✅ 微信生态：分享到朋友圈/群聊、KOL 传播、微信支付
  ✅ 推送：微信服务通知，触达率高
  ✅ 无需应用市场审核，迭代快
  ✅ 微信登录 + 用户授权流程成熟
  ✅ 可以接入微信运动数据（步数等基础数据）

微信小程序风险：
  ⚠️ iOS 和 Android 体验有差异
  ⚠️ 前端代码质量依赖 AI 生成效果（OPC 模式限制）
  ⚠️ 微信审核有健康类内容合规风险
    → 缓解：初期用 H5 版本（微信内嵌网页），规避审核风险
    → 正式版再做小程序上架

结论：MVP 用 H5（微信内嵌），V1.0 评估是否上架小程序。
```

---

## 第三章 数据库设计（MVP Schema）

### 3.1 整体 Schema 设计思路

MVP 数据模型遵循以下原则：
- **反范式优先**：允许合理冗余，减少 JOIN 查询次数（Vercel/Supabase 网络延迟比 JOIN 开销大）
- **JSONB 存储半结构化数据**：灵活应对需求变化（如营养记录字段不固定）
- **软删除**：所有业务表使用 `deleted_at` 字段，保留数据审计能力
- **时间戳全量记录**：方便复盘和调试

### 3.2 表结构设计

#### 3.2.1 用户表 `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,  -- 软删除

  -- 基本信息
  nickname TEXT,
  avatar_url TEXT,

  -- 健康档案（用户主动填写）
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  height_cm NUMERIC(5,2),
  weight_kg NUMERIC(5,2),
  occupation TEXT,
  sleep_goal_hours NUMERIC(3,1) DEFAULT 7.5,

  -- 运动偏好
  fitness_level TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  preferred_workout_time TEXT,  -- 'morning' | 'noon' | 'evening'
  workout_duration_preference INTEGER,  -- 分钟数

  -- 订阅状态
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  subscription_expires_at TIMESTAMPTZ,

  -- 元数据
  onboarding_completed BOOLEAN DEFAULT FALSE,
  last_active_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX idx_users_subscription ON users(subscription_tier) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_last_active ON users(last_active_at DESC) WHERE deleted_at IS NULL;
```

#### 3.2.2 每日摘要表 `daily_summaries`

这是 MVP 的核心表，记录每天的健康状态快照。

```sql
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- 当日汇总数据（由数据同步或 AI 分析填充）
  steps INTEGER,
  active_calories NUMERIC(6,2),
  stand_hours NUMERIC(3,1),

  -- AI 分析结果（核心产出）
  ai_brief TEXT,           -- 晨间简报文本
  ai_plan TEXT,            -- 当日行动建议
  ai_recovery_score NUMERIC(3,1) CHECK (ai_recovery_score BETWEEN 0 AND 100),  -- 恢复分 0-100
  ai_workout_readiness TEXT CHECK (ai_workout_readiness IN ('train', 'light', 'rest')),  -- 训练建议

  -- 反馈数据（用户点击采纳/忽略）
  user_feedback TEXT CHECK (user_feedback IN ('adopted', 'ignored', 'modified')),
  user_feedback_note TEXT,  -- 用户修改内容

  -- 上下文快照（方便调试）
  context_snapshot JSONB,  -- 当日原始数据快照

  -- 唯一约束：每人每天一条
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- 索引
CREATE INDEX idx_daily_user_date ON daily_summaries(user_id, date DESC);
CREATE INDEX idx_daily_recovery ON daily_summaries(user_id, ai_recovery_score DESC) WHERE deleted_at IS NULL;
```

#### 3.2.3 运动记录表 `workout_logs`

```sql
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- 运动类型
  workout_type TEXT,  -- 'strength' | 'cardio' | 'flexibility' | 'hiit' | 'walking'
  workout_name TEXT,  -- '肩颈放松' | '晨间拉伸' | '减脂HIIT'

  -- 运动数据
  duration_minutes INTEGER,
  calories_burned INTEGER,

  -- 主观反馈
  perceived_exertion INTEGER CHECK (perceived_exertion BETWEEN 1 AND 10),  -- RPE 1-10
  mood_after TEXT CHECK (mood_after IN ('great', 'good', 'normal', 'tired', 'exhausted')),
  notes TEXT,

  -- 来源
  source TEXT CHECK (source IN ('user_logged', 'ai_suggested', 'healthkit_sync'))
);

CREATE INDEX idx_workout_user ON workout_logs(user_id, date DESC);
```

#### 3.2.4 睡眠记录表 `sleep_logs`

```sql
CREATE TABLE sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,  -- 起床日期

  -- 睡眠时长
  total_sleep_hours NUMERIC(3,1),
  deep_sleep_hours NUMERIC(3,1),
  light_sleep_hours NUMERIC(3,1),
  rem_sleep_hours NUMERIC(3,1),
  wake_ups INTEGER,  -- 夜间醒来次数

  -- 睡眠质量
  sleep_quality_score NUMERIC(3,1) CHECK (sleep_quality_score BETWEEN 0 AND 100),
  sleep_start_time TIMESTAMPTZ,
  sleep_end_time TIMESTAMPTZ,

  -- AI 分析
  ai_sleep_insight TEXT,

  source TEXT CHECK (source IN ('healthkit_sync', 'user_logged', 'manual'))
);

CREATE INDEX idx_sleep_user ON sleep_logs(user_id, date DESC);
```

#### 3.2.5 健康记忆向量表 `health_memories`（pgvector）

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE health_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 记忆类型（对应四层记忆体系）
  memory_type TEXT NOT NULL CHECK (memory_type IN ('working', 'episodic', 'semantic', 'procedural')),
  memory_type_num INTEGER GENERATED ALWAYS AS (
    CASE memory_type
      WHEN 'working' THEN 1
      WHEN 'episodic' THEN 2
      WHEN 'semantic' THEN 3
      WHEN 'procedural' THEN 4
    END
  ) STORED,

  -- 记忆内容
  content TEXT NOT NULL,           -- 记忆原文
  content_embedding VECTOR(1536),  -- DeepSeek embeddings（1536维）

  -- 元数据
  memory_source TEXT,              -- 'daily_summary' | 'workout' | 'sleep' | 'conversation'
  source_id UUID,                  -- 关联记录 ID

  -- LLM 分析提取的关键信息
  extracted_entities JSONB,  -- {"workout_type": "hiit", "duration": 20, "feeling": "累"}
  importance_score NUMERIC(3,1) DEFAULT 5.0,  -- 重要性 0-10

  -- 过期策略
  expires_at TIMESTAMPTZ,  -- 超过此时间可压缩或删除
  compressed BOOLEAN DEFAULT FALSE
);

-- pgvector 索引（HNSW 算法，高召回+适中速度）
CREATE INDEX idx_memory_embedding ON health_memories
  USING hnsw (content_embedding vector_cosine_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_memory_user_type ON health_memories(user_id, memory_type) WHERE deleted_at IS NULL;

-- Working Memory 空间有限（每个用户保留最近20条）
-- episodic_memory 保留最近180天
-- semantic_memory 和 procedural_memory 长期保留，手动标记过期
```

#### 3.2.6 对话记录表 `conversations`

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- 对话内容（JSONB 存储消息数组）
  messages JSONB DEFAULT '[]'::jsonb,

  -- 统计
  message_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,

  -- 上下文摘要（AI 自动生成，用于 L1 Working Memory）
  context_summary TEXT
);

CREATE INDEX idx_conversation_user_date ON conversations(user_id, date DESC);
```

#### 3.2.7 用户反馈表 `user_feedback`

```sql
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 反馈类型
  feedback_type TEXT CHECK (feedback_type IN ('suggestion', 'complaint', 'bug', 'compliment')),
  target_type TEXT,  -- 'ai_brief' | 'ai_plan' | 'workout_suggestion' | 'sleep_advice'
  target_id UUID,

  -- 反馈内容
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),

  -- AI 分析反馈（用于学习）
  ai_sentiment TEXT CHECK (ai_sentiment IN ('positive', 'neutral', 'negative')),
  resolved BOOLEAN DEFAULT FALSE
);
```

### 3.3 Row Level Security（RLS）策略

```sql
-- 启用 RLS（默认所有表）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- 用户只能读写自己的数据
CREATE POLICY "Users can only see own data" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only see own summaries" ON daily_summaries
  FOR ALL USING (user_id IN (
    SELECT id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can only see own memories" ON health_memories
  FOR ALL USING (user_id IN (
    SELECT id FROM users WHERE id = auth.uid()
  ));

-- 同理，其他表省略（模式一致）
```

### 3.4 数据生命周期策略

| 表名 | 热数据保留 | 冷数据处理 | 说明 |
|------|-----------|-----------|------|
| `users` | 永久 | 无 | 核心用户数据 |
| `daily_summaries` | 最近365天 | 归档为 JSON 文件 | 一年后压缩 |
| `workout_logs` | 最近180天 | 归档 | 运动历史 |
| `sleep_logs` | 最近180天 | 归档 | 睡眠历史 |
| `health_memories` (working) | 最近7天 | 自动过期删除 | 滚动清除 |
| `health_memories` (episodic) | 最近180天 | pgvector 压缩 | 重要性评分低于阈值时压缩 |
| `health_memories` (semantic) | 永久 | 无 | 知识图谱，长期积累 |
| `health_memories` (procedural) | 永久 | 无 | 策略模板，长期积累 |
| `conversations` | 最近90天 | LLM 摘要后删除原文 | 释放 Token 成本 |

---

## 第四章 Agent 系统设计（MVP）

### 4.1 MVP Agent 架构设计

MVP 阶段采用"极简三层 Agent 架构"：

```
┌──────────────────────────────────────────────────────┐
│                   Router Agent                        │
│  职责：根据用户输入，决定走哪个处理路径                 │
│  入口：用户发送消息 / 打开 App / 定时触发              │
└──────────────────────┬───────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌─────────┐   ┌──────────┐   ┌──────────┐
   │ Morning │   │  Query   │   │ Workout  │
   │  Brief  │   │   Agent  │   │  Agent   │
   │  Agent  │   │          │   │          │
   └────┬────┘   └────┬─────┘   └────┬─────┘
        │             │              │
        └─────────────┴──────────────┘
                      │
                      ▼
              ┌───────────────┐
              │ Memory Agent  │
              │  (读写记忆)    │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │ Safety Agent  │
              │ (安全审查)     │
              └───────────────┘
```

**为什么要这样设计：**
- Router 是唯一需要"理解用户意图"的 Agent，其他 Agent 只负责执行特定任务
- Safety Agent 是最后一道防线，防止医疗级错误输出
- MVP 不做 Nutrition / Sleep / Recovery 独立 Agent，统一由 Query Agent 处理（减少 Agent 数量）

### 4.2 各 Agent 详细设计

#### 4.2.1 Router Agent

```
名称：Router Agent
职责：接收用户输入，决定处理路径
输入：用户消息 + 当前上下文（user_id, time_of_day, recent_health_data）
输出：{ intent, agent_to_call, extracted_params }

支持的 Intent 路由：

用户输入类型              → 路由目标
─────────────────────────────────────────────────────
"今天怎么练"              → Workout Agent
"昨天睡得怎么样"          → Query Agent (sleep)
"我肩膀酸"                → Query Agent (symptom)
"今天状态不错"            → Reflection Agent
"感觉好累，要休息吗"      → Query Agent (fatigue)
打开 App（定时触发）       → Morning Brief Agent
用户点击"采纳建议"         → Feedback Agent
默认（闲聊/其他）          → Query Agent (general)

核心 Prompt（草稿）：
---
你是 HOP 的 Router。
用户 ID：{user_id}
当前时间：{current_time}
用户健康数据摘要：{health_summary}

你的任务是分析用户输入，判断用户意图，并决定下一步处理路径。

输出 JSON 格式：
{
  "intent": "意图类型",
  "target_agent": "Agent名称",
  "params": { ... },
  "confidence": 0.0-1.0,
  "safety_check_required": true/false
}

注意事项：
- 如果用户提到身体症状（如"胸口疼""头疼"），直接触发 Safety Agent，不走常规流程
- 如果用户说"锻炼""训练""练""运动"，路由到 Workout Agent
- 每天首次打开 App，路由到 Morning Brief Agent
- 置信度低于 0.6 时，输出 "general" intent，让 Query Agent 处理
```

#### 4.2.2 Morning Brief Agent

```
名称：Morning Brief Agent
职责：每天生成晨间健康简报（Next Action）
触发：每天早上 7:00-9:00，用户打开 App
前置条件：已获取昨日数据（步数、睡眠、心率变异性）

执行流程：
Step 1. 读取 Memory（从 health_memories 表）
  → 查询：最近7天运动记录 + 最近3天睡眠数据 + 用户基础档案

Step 2. 读取 HealthKit 实时数据（如已授权）
  → 当日步数、心率（若无则为 null）

Step 3. 计算恢复分（Recovery Score）
  → 公式（简化版）：
    recovery_score = (
      sleep_quality_score × 0.4 +      # 睡眠权重 40%
      rest_days_factor × 0.3 +          # 是否休息日 30%
      steps_factor × 0.2 +              # 昨日活动量 20%
      mood_factor × 0.1                 # 心情 10%（若有）
    )
  → 评分：0-100，分三档：
    - 80-100：训练（可正常强度）
    - 50-79：轻度活动（拉伸/散步）
    - 0-49：休息（优先恢复）

Step 4. 生成今日计划
  → 语言风格：简洁、直接、"今天只做一件事"
  → 格式：标题 + 理由（一句话）+ 具体操作步骤

Step 5. Safety Check（调用 Safety Agent）

Step 6. 写入 daily_summaries

Step 7. 返回：{ brief_text, workout_readiness, next_action }

输出示例：
---
☀️ 早安，李明
昨天睡得不错（7.5h，深度睡眠1.8h），今天恢复得挺好的。

今天练：肩颈放松
理由：连续伏案3天，肩颈肌肉紧绷是主要风险点。
操作：
1. 早上10点做一组8分钟肩颈拉伸（视频已缓存，离线可用）
2. 下午2点起身站立5分钟（久坐提醒）
3. 晚上做10分钟睡前放松（可选）

今天不练高强度，膝盖昨天已经有点累了。
```

#### 4.2.3 Query Agent

```
名称：Query Agent
职责：回答用户关于健康数据的各类问题
处理范围：
  - 睡眠分析（"我最近睡得好不好"）
  - 训练建议（"我适合做什么运动"）
  - 症状咨询（"肩膀酸怎么办"）⚠️ 非医疗建议
  - 疲劳评估（"最近感觉很累"）
  - 趋势分析（"这周训练情况如何"）

上下文注入（Context）：
  - 用户档案（age, gender, fitness_level, goals）
  - 最近7天运动记录（workout_logs）
  - 最近7天睡眠数据（sleep_logs）
  - 最近3天 daily_summaries
  - 当前日期和时间

Prompt 约束（内置 Hard Rules）：
---
回答规则：
1. 绝对不提"诊断""治疗""处方""药物推荐"
2. 所有建议结尾必须附注："以上为非医疗建议，如有不适请咨询医生"
3. 涉及症状描述时，统一回复："我不是医生，但可以给你一些一般性的健康建议..."
4. 涉及饮食/营养建议时，区分"一般建议"和"个人化建议"（后者需订阅 Pro）
5. 如果用户问"XX 病怎么办"，统一建议就医，不给任何药物或治疗建议
6. 回答长度：一般问题3-5句，趋势分析不超过200字

禁止输出：
- 任何药品名/保健品名
- 任何医疗机构/医生的具体推荐
- 任何涉及精神健康的诊断性表述
```

#### 4.2.4 Workout Agent

```
名称：Workout Agent
职责：生成个性化训练建议
触发时机：用户主动询问训练 / Router 判断需要训练

输入：
  - 用户当前状态（恢复分、疲劳程度、当日步数）
  - 用户档案（fitness_level, preferred_workout_time, workout_duration_preference）
  - 历史训练偏好（procedural_memory 中"哪种训练用户反馈最好"）

核心 Prompt：
---
你是 HOP 的训练专家。
根据以下信息，生成一个具体的今日训练计划：

用户：{name}，{age}岁，{gender}，{fitness_level}
今日恢复分：{recovery_score}
偏好训练时间：{preferred_workout_time}
偏好训练时长：{workout_duration_preference}分钟
最近训练：{recent_workouts}

要求：
- 恢复分 < 50：只给拉伸/散步/休息建议
- 恢复分 50-80：给中等强度建议（训练量 = 偏好的70%）
- 恢复分 > 80：可给正常强度建议
- 训练类型尽量与用户历史偏好一致
- 提供具体的动作名称（不超过5个动作）
- 估算热量消耗
- 说明为什么这个训练"今天适合你"（个性化理由）

⚠️ 不提供：力量训练的重量/组数/次数精确建议（涉及安全，建议用户咨询教练）
```

#### 4.2.5 Safety Agent（强制最后执行）

```
名称：Safety Agent
职责：健康建议安全审查，所有 Agent 输出必须经过此 Agent
触发：Morning Brief / Query Agent / Workout Agent 输出后
执行方式：LLM + 规则引擎双重校验

检查维度：

1. 医疗边界检查（规则引擎）
  IF 内容包含以下关键词 → 直接拦截：
  - "诊断""治疗""处方""开药""住院"
  - "XX病""XX症""感染""炎症"
  - 任何药品名称
  → 拦截并替换为标准话术："这个问题需要医生评估，建议您咨询专业医疗人员。"

2. 强度合理性检查（LLM 判断）
  - 建议的训练强度是否超过用户 fitness_level？
  - 疲劳用户是否被建议休息？
  - 心率异常用户是否被建议运动？

3. 免责声明注入
  - 所有输出末尾必须包含："以上为非医疗建议，如有不适请咨询专业医生。"
  - 如果原输出已有此句，确认位置在末尾

4. 情感安全检查（LLM 判断）
  - 是否对用户造成焦虑/恐惧？
  - 语气是否过于绝对/命令式？
  - 是否有任何可能触发饮食障碍的内容？

拦截后的标准回复库：
- 症状类 → "我不是医生，您描述的症状建议尽快就医。"
- 运动类 → "根据您的情况，建议先咨询专业健身教练或物理治疗师。"
- 饮食类 → "饮食建议因人而异，建议咨询营养师获取个性化方案。"
- 药物类 → "我无法提供药物相关建议，请遵医嘱。"
```

#### 4.2.6 Memory Agent

```
名称：Memory Agent
职责：统一管理四层记忆的读写操作
工具（Tools）：数据库查询 + pgvector 向量检索

主要操作：

写入记忆（Write）：
  Trigger：每次用户交互 / 每日定时任务
  Flow：
  1. 判断记忆类型（L1-L4）
  2. 生成 Embedding（调用 DeepSeek Embedding API）
  3. 写入 health_memories 表
  4. 触发过期检查（working memory 超过20条时删除最旧的）

读取记忆（Read）：
  Trigger：每个 Agent 执行前
  Flow：
  1. 接收查询需求（user_id, memory_type, time_range, query）
  2. 生成查询向量
  3. pgvector 最近邻检索（top_k=10）
  4. 按重要性 + 时间权重排序
  5. 返回格式化记忆上下文

记忆压缩（Compress）：
  Trigger：每周日凌晨 / 记忆量超过阈值
  Flow：
  1. 读取某用户所有 episodic_memory
  2. 调用 LLM 提炼关键模式（"用户每周三睡眠较差"）
  3. 写入 semantic_memory
  4. 标记原 episodic_memory 为 compressed=true
  5. 删除原文，保留压缩后的摘要
```

### 4.3 Agent 间通信协议

MVP 阶段采用"共享上下文 + 顺序调用"模式，不使用复杂的消息队列：

```
通信模式说明：

每个请求的生命周期：

1. Router Agent 接收输入
   → 查询 L1 Working Memory（最近对话）
   → 输出：{ intent, target_agent, params }

2. 目标 Agent 执行
   → 调用 Memory Agent 读取相关记忆
   → 执行业务逻辑
   → 输出：{ response_text, data, safety_passed }

3. Safety Agent 审查（必须）
   → 通过 → 返回给用户
   → 拦截 → 返回标准安全话术

4. Memory Agent 更新记忆
   → 写入 L1 Working Memory（本次对话）
   → 触发 L2 事件写入（如运动完成、睡眠记录）

5. Router 记录本次会话（完成）
```

### 4.4 LangGraph 状态机定义（MVP 简化版）

```python
# langgraph_mvp.py（MVP 用简化版，不上完整 LangGraph）

from typing import TypedDict, Literal

class HealthAgentState(TypedDict):
    user_id: str
    current_time: str
    user_input: str | None  # None 表示定时触发
    intent: str
    target_agent: str
    memory_context: dict
    health_data: dict
    agent_response: str
    safety_passed: bool
    final_response: str

# 简化的节点定义（MVP 不用 LangGraph，用直接函数调用）
# LangGraph 的价值在 V2.0 以后才真正体现

async def router_node(state: HealthAgentState) -> HealthAgentState:
    """路由节点：判断意图"""
    intent = await classify_intent(state["user_input"], state["current_time"])
    state["intent"] = intent["type"]
    state["target_agent"] = intent["agent"]
    return state

async def memory_node(state: HealthAgentState) -> HealthAgentState:
    """记忆节点：读取相关记忆"""
    memories = await memory_agent.read(
        user_id=state["user_id"],
        memory_types=["working", "episodic"],
        time_range_days=7
    )
    state["memory_context"] = memories
    return state

async def health_data_node(state: HealthAgentState) -> HealthAgentState:
    """数据节点：读取最新健康数据"""
    data = await fetch_health_data(state["user_id"])
    state["health_data"] = data
    return state

async def agent_node(state: HealthAgentState) -> HealthAgentState:
    """执行节点：调用对应 Agent"""
    if state["target_agent"] == "morning_brief":
        response = await morning_brief_agent.run(state)
    elif state["target_agent"] == "query":
        response = await query_agent.run(state)
    elif state["target_agent"] == "workout":
        response = await workout_agent.run(state)
    else:
        response = await query_agent.run(state)
    state["agent_response"] = response
    return state

async def safety_node(state: HealthAgentState) -> HealthAgentState:
    """安全节点：审查输出"""
    passed, safe_response = await safety_agent.check(state["agent_response"])
    state["safety_passed"] = passed
    state["final_response"] = safe_response
    return state

async def memory_write_node(state: HealthAgentState) -> HealthAgentState:
    """记忆写入节点：更新记忆"""
    await memory_agent.write(
        user_id=state["user_id"],
        intent=state["intent"],
        response=state["final_response"],
        health_data=state["health_data"]
    )
    return state

# 完整流程串起来（MVP 用 asyncio 顺序执行，不用 LangGraph 复杂图）
async def run_health_agent(user_id: str, user_input: str = None) -> str:
    state = HealthAgentState(
        user_id=user_id,
        current_time=datetime.now().isoformat(),
        user_input=user_input,
        intent="",
        target_agent="",
        memory_context={},
        health_data={},
        agent_response="",
        safety_passed=False,
        final_response=""
    )

    # 顺序执行（MVP 够用）
    state = await router_node(state)
    state = await memory_node(state)
    state = await health_data_node(state)
    state = await agent_node(state)
    state = await safety_node(state)
    state = await memory_write_node(state)

    return state["final_response"]
```

---

## 第五章 Memory System 设计（MVP 版）

### 5.1 四层记忆体系（MVP 实现范围）

| 层级 | 名称 | 存储位置 | MVP 实现 | 长期目标 |
|------|------|---------|---------|---------|
| L1 | Working Memory | Supabase `conversations` | ✅ 完整实现 | 多轮对话上下文 |
| L2 | Episodic Memory | `health_memories` (pgvector) | ✅ 完整实现 | 历史事件时间线 |
| L3 | Semantic Memory | `health_memories` (pgvector) | ⚠️ 简化版 | 用户画像 + 健康知识图谱 |
| L4 | Procedural Memory | `health_memories` (JSONB) | ⚠️ 简化版 | 有效策略模板 |

### 5.2 L1 Working Memory 实现

```sql
-- 每次对话更新 L1（直接更新 messages JSONB）
UPDATE conversations
SET
  messages = messages || '{"role": "user", "content": "...", "ts": "..."}'::jsonb,
  message_count = message_count + 1,
  context_summary = (
    -- AI 提取摘要（节省上下文）
    SELECT ai_summary(messages || '{"role": "user", "content": "..."}'::jsonb)
  )
WHERE user_id = $user_id AND date = CURRENT_DATE;

-- MVP 限制：每条会话最多保留 20 轮（约 5000 tokens）
-- 超过后触发摘要压缩
```

**上下文窗口管理策略：**

```
当 messages 数组超过 20 条时：
  1. 调用 DeepSeek 生成 200 字摘要（context_summary）
  2. 截断 messages，保留最近 5 轮
  3. 将摘要注入为 system prompt 前缀

System Prompt 前缀格式：
---
[历史摘要] 过去对话摘要：{context_summary}
[用户档案] {user_profile}
[当前时间] {current_time}
---
```

### 5.3 L2 Episodic Memory 实现

```sql
-- 写入情景记忆（事件驱动）
INSERT INTO health_memories (user_id, memory_type, content, content_embedding, ...)
VALUES (
  $user_id,
  'episodic',
  '2026-07-20，用户完成了30分钟HIIT训练，RPE=7，练后感觉良好',
  embedding('...'),  -- DeepSeek embeddings
  '{"event_type": "workout", "workout_type": "hiit", "duration": 30, "rpe": 7}'::jsonb,
  7.5,  -- importance
  NOW() + INTERVAL '180 days'  -- 180天后可压缩
);

-- 检索情景记忆（MVP 简单实现）
-- 按时间 + 语义相似度双重排序
SELECT
  content,
  extracted_entities,
  created_at,
  1 - (content_embedding <=> query_embedding) AS similarity
FROM health_memories
WHERE
  user_id = $user_id
  AND memory_type = 'episodic'
  AND deleted_at IS NULL
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY
  similarity DESC,
  created_at DESC
LIMIT 10;
```

**L2 记忆触发写入的事件：**

| 事件 | 写入内容 |
|------|---------|
| 用户完成运动 | `{event: "workout_completed", type, duration, rpe, mood}` |
| 用户晨间打开 App | `{event: "morning_brief_viewed", recovery_score, plan_adopted}` |
| 用户修改 AI 建议 | `{event: "ai_plan_modified", original, modified}` |
| 用户反馈 | `{event: "feedback_given", type, content, sentiment}` |
| 周末/月末 | `{event: "weekly_review", summary}` |

### 5.4 L3 + L4 简化实现（MVP 阶段）

```python
# memory_v3_v4.py

async def extract_semantic_memory(user_id: str) -> None:
    """L3：每周从 L2 提炼语义记忆（压缩）"""
    # 读取最近30天 episodic memories
    episodes = await db.query("""
        SELECT content, extracted_entities, created_at
        FROM health_memories
        WHERE user_id = $1 AND memory_type = 'episodic'
        AND created_at > NOW() - INTERVAL '30 days'
        AND compressed = FALSE
    """, user_id)

    if len(episodes) < 5:
        return  # 数据太少，不提炼

    # LLM 提炼模式（每用户每月最多调用1次）
    prompt = f"""
    分析以下用户过去30天的健康行为记录，提炼出3-5个最重要的长期模式。

    记录：
    {episodes_text}

    输出格式：
    {{
      "patterns": [
        {{"pattern": "描述", "confidence": 0.0-1.0, "evidence": "支撑数据"}},
        ...
      ]
    }}
    """

    result = await llm.call(prompt)
    patterns = result["patterns"]

    # 写入 semantic memory
    for pattern in patterns:
        await db.insert("""
            INSERT INTO health_memories
            (user_id, memory_type, content, extracted_entities, importance_score)
            VALUES ($1, 'semantic', $2, $3, $4)
        """, user_id, pattern["pattern"], json.dumps(pattern), pattern["confidence"] * 10)


async def extract_procedural_memory(user_id: str) -> None:
    """L4：提取有效的行动策略"""
    # 找用户反馈"adopted"的建议
    adopted = await db.query("""
        SELECT ai_plan, user_feedback_note
        FROM daily_summaries
        WHERE user_id = $1
        AND user_feedback = 'adopted'
        AND ai_plan IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 20
    """, user_id)

    if len(adopted) < 5:
        return

    # LLM 提炼有效策略
    prompt = f"""
    分析以下被用户采纳的 AI 健康建议，总结出2-3个"对这位用户有效"的具体策略。

    建议列表：
    {adopted_text}

    输出：
    {{
      "strategies": [
        {{"strategy": "策略描述", "applicability": "何时使用", "effectiveness": "为什么有效"}},
        ...
      ]
    }}
    """

    result = await llm.call(prompt)
    for strategy in result["strategies"]:
        await db.insert("""
            INSERT INTO health_memories
            (user_id, memory_type, content, extracted_entities, memory_source)
            VALUES ($1, 'procedural', $2, $3, 'ai_learning')
        """, user_id, strategy["strategy"], json.dumps(strategy))
```

### 5.5 记忆召回策略

```python
async def retrieve_memory_context(
    user_id: str,
    query: str,
    memory_types: list = None,  # ['working', 'episodic', 'semantic']
    max_tokens: int = 2000
) -> str:
    """
    统一记忆召回接口
    返回格式化的记忆上下文，供 Agent 使用
    """

    if memory_types is None:
        memory_types = ['working', 'episodic', 'semantic']

    context_parts = []
    total_tokens = 0

    # 1. L1 Working Memory（优先，权重最高）
    if 'working' in memory_types:
        conv = await db.query("""
            SELECT context_summary, messages
            FROM conversations
            WHERE user_id = $1 AND date = CURRENT_DATE
            ORDER BY created_at DESC LIMIT 1
        """, user_id)
        if conv:
            text = f"[今日对话摘要] {conv['context_summary']}"
            context_parts.append(text)
            total_tokens += count_tokens(text)

    # 2. L2 Episodic Memory（语义检索）
    if 'episodic' in memory_types and total_tokens < max_tokens:
        query_emb = await embedding.embed(query)
        episodes = await db.query("""
            SELECT content, importance_score,
                   1 - (content_embedding <=> $2) AS similarity
            FROM health_memories
            WHERE user_id = $1
            AND memory_type = 'episodic'
            AND deleted_at IS NULL
            AND created_at > NOW() - INTERVAL '30 days'
            ORDER BY similarity DESC
            LIMIT 5
        """, user_id, query_emb)

        for ep in episodes:
            text = f"[历史事件] {ep['content']}"
            context_parts.append(text)
            total_tokens += count_tokens(text)

    # 3. L3 Semantic Memory（用户画像）
    if 'semantic' in memory_types and total_tokens < max_tokens:
        semantics = await db.query("""
            SELECT content, importance_score
            FROM health_memories
            WHERE user_id = $1 AND memory_type = 'semantic'
            AND deleted_at IS NULL
            ORDER BY importance_score DESC
            LIMIT 5
        """, user_id)
        for sem in semantics:
            text = f"[用户模式] {sem['content']}"
            context_parts.append(text)
            total_tokens += count_tokens(text)

    # 4. L4 Procedural Memory（有效策略）
    if 'procedural' in memory_types and total_tokens < max_tokens:
        procedures = await db.query("""
            SELECT content
            FROM health_memories
            WHERE user_id = $1 AND memory_type = 'procedural'
            AND deleted_at IS NULL
            ORDER BY importance_score DESC
            LIMIT 3
        """, user_id)
        for proc in procedures:
            text = f"[有效策略] {proc['content']}"
            context_parts.append(text)
            total_tokens += count_tokens(text)

    return "\n\n".join(context_parts)
```

### 5.6 记忆系统的 MVP 边界

**MVP 阶段不做的：**
- ❌ 自动记忆压缩调度器（每周手动触发）
- ❌ 跨用户群体记忆（联邦学习）
- ❌ 记忆重要性自动评分（暂时用固定值 5.0）
- ❌ L3 知识图谱可视化

**V1.0 阶段要加的：**
- ✅ 自动压缩调度（Supabase Cron）
- ✅ 记忆召回置信度评分
- ✅ 基于记忆的 A/B 测试

---

## 第六章 LLM 调用与成本控制

### 6.1 模型选择策略

| 场景 | 主力模型 | 降级1 | 降级2 | 成本参考 |
|------|---------|-------|-------|---------|
| 日常对话 / 简单查询 | DeepSeek-V3 | Qwen-Max | Claude 3.5 | ¥0.5-2/千次 |
| 晨间简报生成 | DeepSeek-V3 | Qwen-Max | — | ¥1-3/次 |
| 复杂推理 / 记忆提炼 | Qwen-Max | Claude 3.5 | — | ¥3-10/次 |
| 向量 Embedding | DeepSeek Embedding | — | — | ¥0.1/千次 |
| Safety Check | Qwen-Max（规则） | — | — | ¥0.1/次 |
| 极简 Safety（关键词） | 本地规则引擎 | — | — | 免费 |

### 6.2 Model Gateway 实现（MVP 简化版）

```python
# model_gateway.py

import asyncio
from enum import Enum
from typing import Optional

class Model(Enum):
    DEEPSEEK_V3 = "deepseek/deepseek-chat-v3"
    QWEN_MAX = "qwen/qwen-max"
    CLAUDE_35 = "anthropic/claude-3-5-sonnet"
    DEEPSEEK_EMBED = "deepseek/deepseek-embedding"

class ModelGateway:
    """
    MVP 简化版 Model Gateway
    - 按场景选模型
    - 自动降级
    - Token 统计
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://openrouter.ai/api/v1"  # 统一入口

    async def call(
        self,
        model: Model,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> str:
        """带降级的 LLM 调用"""

        models_to_try = self._get_fallback_chain(model)

        for m in models_to_try:
            try:
                response = await self._make_request(m, prompt, temperature, max_tokens)
                await self._log_usage(m, prompt, response)  # 成本统计
                return response
            except RateLimitError:
                await asyncio.sleep(2)  # 限流等待
                continue
            except ModelUnavailableError:
                continue  # 尝试下一个
            except Exception as e:
                # 未知错误，只在最后一个模型时抛出
                if m == models_to_try[-1]:
                    raise

        raise AllModelsFailedError("所有模型均不可用")

    def _get_fallback_chain(self, model: Model) -> list:
        """定义每个场景的降级链"""
        chains = {
            Model.DEEPSEEK_V3: [Model.DEEPSEEK_V3, Model.QWEN_MAX, Model.CLAUDE_35],
            Model.QWEN_MAX: [Model.QWEN_MAX, Model.CLAUDE_35],
            Model.CLAUDE_35: [Model.CLAUDE_35],  # Claude 没有更好的降级
            Model.DEEPSEEK_EMBED: [Model.DEEPSEEK_EMBED],
        }
        return chains.get(model, [model])

    async def _log_usage(self, model: Model, prompt: str, response: str):
        """记录 Token 消耗（用于成本监控）"""
        tokens_in = count_tokens(prompt)
        tokens_out = count_tokens(response)
        cost = calculate_cost(model, tokens_in, tokens_out)

        # 写入 Supabase（方便查看月账单）
        await db.execute("""
            INSERT INTO token_usage_logs (user_id, model, tokens_in, tokens_out, cost)
            VALUES ($1, $2, $3, $4, $5)
        """, self.user_id, model.value, tokens_in, tokens_out, cost)

    def calculate_cost(self, model: Model, tokens_in: int, tokens_out: int) -> float:
        """计算单次调用成本（人民币）"""
        pricing = {
            Model.DEEPSEEK_V3: (0.5, 1.5),   # ¥/百万token in, out
            Model.QWEN_MAX: (2.0, 6.0),
            Model.CLAUDE_35: (3.0, 15.0),
            Model.DEEPSEEK_EMBED: (0.1, 0),
        }
        rate_in, rate_out = pricing[model]
        return (tokens_in / 1_000_000 * rate_in) + (tokens_out / 1_000_000 * rate_out)
```

### 6.3 成本控制策略

**MVP 阶段月成本目标：¥200（LLM 消耗）**

```python
# 成本控制规则（MVP 强制执行）

COST_BUDGET_MONTHLY = 200  # 月度 LLM 预算 ¥200
COST_WARNING_THRESHOLD = 150  # ¥150 触发警告
COST_KILL_THRESHOLD = 200  # ¥200 停止非必要调用

class CostController:
    def __init__(self, user_id: str):
        self.user_id = user_id

    async def check_budget(self) -> dict:
        """检查本月消耗，决定是否允许调用"""
        used = await self.get_monthly_usage()

        if used >= COST_KILL_THRESHOLD:
            return {"allowed": False, "reason": "月度预算已用完"}
        elif used >= COST_WARNING_THRESHOLD:
            return {"allowed": True, "warning": f"本月已消耗 ¥{used}，请注意"}
        else:
            return {"allowed": True, "remaining": COST_BUDGET_MONTHLY - used}

    async def get_monthly_usage(self) -> float:
        """从 token_usage_logs 汇总月度成本"""
        result = await db.query("""
            SELECT COALESCE(SUM(cost), 0) as total
            FROM token_usage_logs
            WHERE user_id = $1
            AND created_at > date_trunc('month', NOW())
        """, self.user_id)
        return result[0]["total"]

# Token 节省技巧

TOKEN_SAVING_TIPS = {
    # 1. 用 context_summary 而非完整对话
    "use_summary": "超过10轮对话后用 LLM 摘要，不传完整历史",

    # 2. 限制回复长度
    "limit_length": "简单问题强制 max_tokens=300，避免 LLM 生成冗长回复",

    # 3. 批量处理
    "batch": "多用户数据批量分析时，用一个 LLM 调用处理（节省初始化开销）",

    # 4. 缓存相似查询
    "cache": "相同问题的答案在 1 小时内缓存（Supabase 缓存表）",

    # 5. 规则引擎替代 LLM
    "rule_engine": "Safety Check 第一步用正则/关键词检查，匹配才调 LLM",
}
```

### 6.4 Prompt 模板库（MVP）

```python
# prompt_templates.py

PROMPTS = {
    "morning_brief": """你是 HOP，一位专业、温暖、简洁的个人健康教练。

用户信息：
{user_profile}

今日数据：
{health_data}

历史记忆：
{memory_context}

请生成晨间简报，包含：
1. 一句话问候 + 今日关键词
2. 今日行动建议（只给一个重点，不贪多）
3. 理由（为什么今天适合/不适合运动，个性化）
4. 一个具体操作建议

语言风格：简洁、温暖、像朋友在说，不啰嗦。
格式：纯文本，不超过200字。结尾附注"非医疗建议"。

开始：""",

    "workout_suggestion": """你是专业健身教练。

用户：{user_profile}
今日恢复分：{recovery_score}/100
{fitness_history}

生成一个今日训练计划：
- 训练时长：{preferred_duration}分钟
- 训练类型：根据用户偏好和恢复分选择
- 具体动作：3-5个动作（名称 + 要点）
- 个性化理由：为什么这个计划今天适合他

禁止：重量/组数/次数的具体建议。
格式：Markdown。

开始：""",

    "memory_summary": """你是记忆压缩专家。以下是用户{user_name}的近期对话记录：

{conversation_log}

请生成一段200字以内的摘要：
- 总结用户的健康状态变化
- 提取3个关键事件或模式
- 标注需要长期记忆的重点

格式：
[摘要] ...
[关键事件] ...
[建议关注] ...
""",

    "safety_check": """请检查以下健康建议是否存在医疗风险：

建议内容：
{suggestion}

检查维度：
1. 是否包含诊断/治疗/处方内容？
2. 是否建议了具体的医疗行为？
3. 是否有任何可能造成用户焦虑的内容？

输出 JSON：
{{
  "safe": true/false,
  "risk_level": "none/low/medium/high",
  "risk_reason": "如果有风险，说明原因",
  "safe_alternative": "如果需要，给出安全替代话术"
}}""",
}
```

---

## 第七章 外部数据接入

### 7.1 iOS HealthKit 接入方案

**MVP 阶段接入范围（最小闭环）：**

| 数据类型 | 优先级 | 来源 | MVP 可用 |
|---------|-------|------|---------|
| 步数 / 活动能量 | P0 | HealthKit | ✅ |
| 睡眠时长 | P1 | HealthKit | ✅ |
| 心率 | P2 | HealthKit | ✅ |
| 运动记录 | P1 | HealthKit | ✅ |
| 体重 | P2 | 用户手动 | ✅ |
| 血氧 | P3 | HealthKit | ⚠️ 设备限制 |
| 饮食 | P3 | 不接入 | ❌ |

**HealthKit 权限申请（info.plist）：**

```xml
<key>NSHealthShareUsageDescription</key>
<string>HOP 需要读取您的运动和睡眠数据，以生成个性化的健康建议。</string>

<key>NSHealthUpdateUsageDescription</key>
<string>HOP 需要写入您的运动记录，帮助您追踪健康目标。</string>
```

**HealthKit 数据读取（微信小程序端 / H5无法直接访问，需原生桥接）：**

```swift
// iOS 端数据读取（MVP 用 Swift 写小程序插件，或用uni-app桥接）
// 这里写 Swift 示例

import HealthKit

class HealthKitManager {
    private let healthStore = HKHealthStore()

    // 读取当日步数
    func fetchTodaySteps() async throws -> Int {
        let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount)!
        let startOfDay = Calendar.current.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(
            withStart: startOfDay,
            end: Date(),
            options: .strictStartDate
        )

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: stepType,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, result, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else {
                    let steps = result?.sumQuantity()?.doubleValue(for: .count()) ?? 0
                    continuation.resume(returning: Int(steps))
                }
            }
            healthStore.execute(query)
        }
    }

    // 读取睡眠数据（入睡时间 + 醒来时间）
    func fetchLastNightSleep() async throws -> [String: Any] {
        let sleepType = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis)!
        let startOfYesterday = Calendar.current.date(byAdding: .day, value: -1, to: Date())!
        let start = Calendar.current.startOfDay(for: startOfYesterday)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: sleepType,
                predicate: HKQuery.predicateForSamples(withStart: start, end: Date()),
                limit: HKObjectQueryNoLimit,
                sortDescriptors: nil
            ) { _, samples, error in
                // 解析睡眠数据，返回时长 + 入睡时间 + 醒来时间
                // 具体实现省略
                continuation.resume(returning: [:])
            }
            healthStore.execute(query)
        }
    }
}
```

**微信小程序桥接方案（MVP 最快路径）：**

```
方案选择理由：
微信小程序和 iOS HealthKit 无法直接通信，需要原生桥接。
MVP 最快方案：用 uni-app 或 Tron-class 开发小程序，
一套代码同时支持 iOS HealthKit 和 Android HMS。

技术栈：
- 前端：uni-app（Vue 语法，编译到 iOS/Android/小程序）
- 桥接：原生插件（iOS Swift / Android Kotlin）
- 数据上传：调用 Supabase REST API

优势：开发效率高，跨平台兼容
劣势：性能略低于原生，HealthKit 插件需付费（约 ¥500/年）
```

### 7.2 Android 华为 Health / 小米健康接入

**MVP 阶段策略：暂不接入 Android 真实数据**

理由：
1. 华为 Health SDK 和小米 Health 需要设备端安装对应 App，碎片化严重
2. Android 健康数据权限比 iOS 更复杂（各家标准不统一）
3. MVP 用户以 iOS 为主（Apple Watch 生态完整）

**MVP Android 数据方案：**

```
替代方案：
1. 微信运动（读取微信步数，授权即可）
2. Mock 数据（用户在 App 内手动输入）
3. 开放 API 接入（企业用户）

后续计划（V1.0）：
- Android：接入华为 HealthKit（华为手机内置，覆盖率高）
- 小米/OPPO/Vivo：接入各自健康 SDK
```

### 7.3 Mock 数据服务（MVP 开发阶段）

```python
# mock_health_data.py
# MVP 开发阶段，用于本地调试和 Demo

import random
from datetime import datetime, timedelta

class MockHealthDataGenerator:
    """生成模拟健康数据，用于开发调试"""

    def generate_daily_summary(self, user_profile: dict) -> dict:
        # 模拟步数（基于用户 fitness_level）
        base_steps = {
            "beginner": random.randint(3000, 6000),
            "intermediate": random.randint(5000, 10000),
            "advanced": random.randint(8000, 15000)
        }

        # 模拟睡眠（按用户 sleep_goal 浮动）
        goal = user_profile.get("sleep_goal_hours", 7.5)
        sleep_hours = round(goal + random.uniform(-1.5, 1.5), 1)

        return {
            "date": datetime.now().date().isoformat(),
            "steps": base_steps.get(user_profile.get("fitness_level", "beginner")),
            "active_calories": random.randint(200, 600),
            "stand_hours": random.randint(4, 10),
            "sleep": {
                "total_hours": sleep_hours,
                "deep_sleep_hours": round(sleep_hours * 0.2, 1),
                "light_sleep_hours": round(sleep_hours * 0.5, 1),
                "rem_sleep_hours": round(sleep_hours * 0.25, 1),
                "wake_ups": random.randint(0, 4),
                "sleep_start": (datetime.now() - timedelta(hours=sleep_hours)).isoformat(),
                "sleep_end": datetime.now().isoformat()
            },
            "heart_rate": {
                "resting": random.randint(55, 75),
                "max": random.randint(120, 180),
                "avg": random.randint(70, 100)
            },
            "mood": random.choice(["great", "good", "normal", "tired"]),
            "workout_done": random.choice([True, False, False]),  # 70% 没运动
        }

# Supabase Edge Functions 中的 Mock 数据开关
"""
开发环境（CLIENT_SIDE = 'mock'）：
  → 返回 MockHealthDataGenerator 生成的数据

生产环境：
  → 优先读取 HealthKit
  → 如果用户未授权 → 引导用户授权
  → 如果 HealthKit 数据为空 → 提示用户打开健康数据权限
"""
```

---

## 第八章 OPC 研发 SOP

### 8.1 Cursor 多 Agent 配置

```yaml
# .cursor/rules/health-agent-mvp.mdc
# Cursor Agent 规则文件（加载到所有 Cursor 会话）

---
name: HOP Developer
role: Full-stack Python + TypeScript developer
constraints:
  - 数据库只用 Supabase（不引入新数据库）
  - 后端逻辑在 Supabase Edge Functions（Node.js）
  - 不使用 Kubernetes / Docker（OPC 运维限制）
  - 每个文件改动不超过 200 行（方便 AI 处理）
  - 所有敏感信息（API Key）必须从环境变量读取
  - 不提交 .env 文件到 git

code_standards:
  typescript:
    - 使用 TypeScript 4+
    - 禁止使用 any
    - 所有 API 返回值必须有类型定义
  python:
    - Python 3.11+
    - 使用 type hints
    - 优先使用 async/await

safety_rules:
  - 健康建议输出必须经过 Safety Agent
  - 用户数据不得写入日志（debug 日志只写 user_id，不写内容）
  - 数据库查询必须用参数化查询（防 SQL 注入）

files_to_modify:
  "**/*.ts": "前端代码"
  "**/*.py": "后端 / Supabase Functions"
  "supabase/**/*": "数据库 Schema / RLS"
  ".cursor/rules/**/*": "AI 行为规范"
```

### 8.2 agent.md 规范模板

```markdown
# HOP — agent.md

## 项目概述
- 项目名：HOP（个人健康智能体）
- 阶段：MVP（4周开发）
- 目标用户：25-40岁城市白领，MVP 测试用户 50 人
- 核心功能：晨间简报 + 个性化训练建议 + 长期记忆陪伴

## 技术栈
- 前端：微信小程序（H5）/ uni-app
- 后端：Supabase（PostgreSQL + Edge Functions）
- Agent 框架：LangGraph（Python）
- LLM：DeepSeek-V3（主力）+ Qwen-Max（降级）
- 向量：Supabase pgvector
- 部署：Supabase Cloud

## 禁止事项（任何人/AI 都不能做的）
1. ❌ 不得在代码中硬编码 API Key（必须从环境变量读取）
2. ❌ 不得在日志中记录用户健康数据内容
3. ❌ 不得引入非必要依赖（先看 Supabase 能否解决）
4. ❌ 不得修改数据库 Schema（需经过创始人审批）
5. ❌ 不得绕过 Safety Agent 输出任何健康建议
6. ❌ 不得在生产环境使用 Mock 数据（除非用户明确选择"模拟模式"）
7. ❌ 不得提交不包含测试的代码（每个 API 必须有对应测试）

## 代码规范
### 文件大小限制
- 单文件不超过 300 行（超过则拆分）
- 单函数不超过 50 行（超过则拆分）

### 提交规范
- 每 2-4 小时提交一次（不要憋大 commit）
- Commit 信息格式：`[模块] 简短描述`
  - 示例：`[morning-brief] 添加恢复分计算逻辑`
  - 示例：`[safety] 拦截药品名称关键词`
  - 示例：`[db] 新增 health_memories 表`

### AI 代码验收（创始人 SOP）
每次 Cursor AI 生成代码后，必须执行以下检查：
1. 读取生成的代码，确认逻辑符合需求
2. 检查是否有 `console.log` / `print` 调试代码残留
3. 检查是否有硬编码的测试数据（生产环境需要删掉）
4. 运行 `npm test` / `pytest`（如果存在）
5. 在本地验证核心路径（如 Morning Brief 生成）
6. 如有报错，复制错误信息给 Cursor，让 AI 自己修复（Test Agent 循环）

## 开发优先级（本周任务）
[W1] 数据库 Schema + Supabase 项目初始化
[W1] 用户登录 + 基本档案
[W2] Morning Brief Agent（MVP 核心功能）
[W2] HealthKit 数据同步（iOS）
[W3] Workout Agent + Safety Agent
[W4] 记忆系统 + 反馈机制
[W4] 测试 + 上线

## 已知技术债务（V1.0 再处理）
- Android 健康数据接入（暂用手动输入）
- L3/L4 记忆提炼自动化（目前手动触发）
- 多语言支持（未来支持英文用户）
- 微信支付订阅（订阅收费功能）
```

### 8.3 OPC 开发工作流

```
每日开发 SOP（创始人日均投入 2-4 小时）：

08:00  查看 Cursor（检查 AI 夜间任务完成情况）
  ├── 查看 GitHub commits
  ├── 运行测试，确认无 regression
  └── 记录遇到的问题

09:00  当日任务规划（用一张 Notion 卡片）
  ├── 今日目标：1个功能 + 1个验收
  ├── 在 Cursor 中开新 Agent 会话
  └── 描述任务 + 提供 context

09:30-11:30  AI 编码时间
  ├── Cursor Agent 执行编码
  ├── 每 30 分钟检查一次进度
  ├── 遇到阻塞立即接手（不要等 AI 自己解决）
  └── AI 报错 → 复制错误 → 交给 Cursor 修复

11:30  当日验收
  ├── 功能测试（手动 + 自动化）
  ├── 检查代码质量（无调试代码、无硬编码）
  └── 提交 git + 记录完成情况

19:00  晚间检查（如有）
  ├── 处理 Cursor Agent 白天未完成的任务
  └── 规划明日任务

周末：
  ├── 记忆压缩（如有需要）
  ├── 用户反馈分析
  └── 技术债务清理
```

### 8.4 Test Agent 使用规范

```python
# test_agent_workflow.py
# OPC 模式下，用 AI 做测试驱动开发

"""
Test Agent 工作流程（每个功能模块）：

1. 创始人描述功能需求（给 Cursor）
2. Cursor 生成功能代码
3. Cursor 生成对应测试代码（pytest / Jest）
4. Cursor 运行测试 → 看到失败
5. Cursor 根据测试报错修改代码（循环 3-4 次）
6. 创始人验收最终代码

示例：实现"恢复分计算"

Step 1: 给 Cursor 指令
---
请实现 HOP 的"恢复分计算"功能：

函数签名：
  def calculate_recovery_score(sleep_hours: float, sleep_quality: float,
                                 rest_days: int, steps: int) -> float:

计算规则：
  - 睡眠权重 40%，满分 40 分
  - 休息日权重 30%，满分 30 分（连续休息日每天 +10 分，封顶 30）
  - 活动量权重 20%，满分 20 分（步数 / 1000 * 2，上限 20）
  - 主观权重 10%，满分 10 分（基础 5 分，状态好 +5）

测试用例（必须通过）：
  test_recovery_full_sleep() → sleep=8h, quality=90 → ≥70
  test_recovery_poor_sleep() → sleep=4h, quality=40 → ≤40
  test_recovery_rest_day() → rest_days=2 → ≥30（仅休息日部分）
  test_recovery_active() → steps=15000 → ≥20（仅活动量部分）

请先生成 pytest 测试，运行测试看到失败后，再实现功能代码。
---
"""
```

### 8.5 Git 工作流（OPC 简化版）

```bash
# 分支策略（MVP 简化版：只有两条分支）
main        # 生产代码
dev         # 开发中的代码

# 开发流程
git checkout dev
# 编写功能 / 让 Cursor 编写
git add -p  # 选择性提交（不提交无关改动）
git commit -m "[模块] 简短描述"
git push origin dev

# 每周五合并到 main（发布候选）
git checkout main
git merge dev
git tag "v0.x.x"
git push origin main --tags

# 遇到紧急 bug：直接从 main 开 hotfix 分支
git checkout -b hotfix/describe-bug
# 修复后直接合并 main
```

---

## 第九章 安全与合规

### 9.1 健康数据分级

```python
# data_classification.py

DATA_SENSITIVITY_LEVELS = {
    # Level 1：公开（可匿名统计）
    "level_1_public": [
        "当天是否有运动（布尔值）",
        "当天总步数（整数）",
        "用户年龄段（范围）",
    ],

    # Level 2：私密（需登录，RLS 保护）
    "level_2_private": [
        "运动记录详情（类型、时长、感受）",
        "睡眠记录（入睡时间、睡眠阶段）",
        "AI 健康建议内容",
        "用户反馈",
    ],

    # Level 3：高度私密（需额外加密和授权）
    "level_3_sensitive": [
        "心率原始数据",
        "疾病/健康问题描述",
        "AI 对用户健康的判断性评注",
        "用户主动输入的敏感信息",
    ]
}

# 存储策略
"""
Level 1：普通数据库列
Level 2：PostgreSQL + RLS + 传输加密（HTTPS）
Level 3：额外加密（pgcrypto） + 访问日志 + 用户明确授权
"""

# PostgreSQL 列加密示例（Level 3）
"""
ALTER TABLE health_sensitive_data
ADD COLUMN heart_rate_data JSONB
ENCRYPTED WITH (ALGORITHM = 'aes-256-cbc');
-- 注：pgcrypto 需要 Supabase Enterprise，或用应用层加密
-- MVP 简化：Level 3 数据暂存第三方可信服务（如有）
"""
```

### 9.2 Safety Agent 规则引擎（MVP）

```python
# safety_rules.py

import re

# 第一层：关键词拦截（免费 + 毫秒级）
MEDICAL_BLOCKED_PATTERNS = [
    # 诊断类
    r"(诊断|确诊|患有|得了)",

    # 药品类
    r"(阿司匹林|布洛芬|降压药|胰岛素|抗生素|处方药)",

    # 严重症状类（需立即建议就医）
    r"(胸痛|胸闷|呼吸困难|咳血|昏迷|半身不遂)",
    r"(自杀|自残|想死|不想活了)",

    # 疾病名称
    r"(高血压|糖尿病|心脏病|癌症|肿瘤|艾滋病)",
    r"(焦虑症|抑郁症|精神分裂|躁郁症)",
]

# 推荐就医类（半拦截）
MEDICAL_REFERRED_PATTERNS = [
    r"(一直疼|持续疼|越来越严重|流血|伤口|骨折)",
    r"(怀孕|备孕|月经不调|妇科)",
    r"(儿童|老人|患者)(身体|健康|生病)",
]

# 第二层：意图识别（LLM，轻量级）
REFERRAL_INTENTS = [
    "用户描述的症状持续多久了",
    "这种情况持续超过",
    "我是不是得了",
    "需要去医院吗",
]

def safety_check_first_pass(text: str) -> dict:
    """第一层：规则引擎检查（毫秒级）"""

    for pattern in MEDICAL_BLOCKED_PATTERNS:
        if re.search(pattern, text):
            return {
                "passed": False,
                "action": "BLOCK",
                "response": "我不是医生，您描述的情况建议尽快就医或咨询专业医疗人员。",
                "log": f"BLOCKED: matched pattern '{pattern}'"
            }

    for pattern in MEDICAL_REFERRED_PATTERNS:
        if re.search(pattern, text):
            return {
                "passed": True,
                "action": "REFER",
                "response": "我不是医生，关于这个问题，建议您咨询专业医生获得准确建议。",
                "log": f"REFERRED: matched pattern '{pattern}'"
            }

    return {"passed": True, "action": "ALLOW", "response": None}

def safety_check_llm(text: str, user_context: dict) -> dict:
    """
    第二层：LLM 检查（处理复杂情况）
    仅在第一层通过后执行，且每日每用户最多调用 3 次
    """
    # 具体实现见 4.2.5 Safety Agent 章节
    pass

def inject_medical_disclaimer(response: str) -> str:
    """强制注入免责声明"""
    disclaimer = "\n\n⚠️ 以上为非医疗建议，如有不适请咨询专业医生。"

    if disclaimer in response:
        return response  # 已有，不重复注入

    return response + disclaimer
```

### 9.3 数据合规清单（MVP）

| 合规要求 | 实现方式 | 状态 |
|---------|---------|------|
| 《个人信息保护法》用户知情同意 | 首次注册时明确告知数据用途，用户勾选同意 | ✅ 需实现 |
| 数据最小化收集 | 只收集 MVP 必需的数据 | ✅ 已设计 |
| 用户数据导出权 | 提供 JSON 导出功能（设置页面） | ⚠️ V1.0 实现 |
| 用户数据删除权 | 软删除 + 30天后物理删除 | ⚠️ V1.0 实现 |
| 未成年人保护 | MVP 禁止 18岁以下用户注册 | ⚠️ 需在注册页加年龄确认 |
| 健康数据分类分级 | 见 9.1 数据分级设计 | ✅ 已设计 |
| 紧急情况引导 | AI 发现严重症状时，引导拨打120 | ✅ Safety Agent |

---

## 第十章 技术路线图

### 10.1 分阶段规划

```
MVP（0-4周）→ V1.0（5-12周）→ V2.0（3-6个月）→ Health OS（6-12个月）

═══════════════════════════════════════════════════════
MVP 阶段（0-4周）  目标：核心闭环跑通
═══════════════════════════════════════════════════════

[W1] 基础设施
  ✅ Supabase 项目初始化
  ✅ 数据库 Schema（users, daily_summaries, health_memories, conversations）
  ✅ 微信小程序/uni-app 初始化
  ✅ 用户注册 + 登录（Supabase Auth）

[W2] 核心功能
  ✅ Morning Brief Agent（晨间简报）
  ✅ HealthKit 数据同步（iOS）
  ✅ 基础 Health Data 显示

[W3] 交互 + 安全
  ✅ Query Agent（健康答疑）
  ✅ Workout Agent（训练建议）
  ✅ Safety Agent（双重安全审查）
  ✅ 用户反馈机制

[W4] 记忆 + 上线
  ✅ Memory Agent（L1 + L2）
  ✅ 每日推送（定时任务）
  ✅ 种子用户测试（10人）
  ✅ 小范围上线（50人内测）

MVP 交付物：
  📱 可在微信内使用的 H5 版本
  🤖 Morning Brief 每日推送
  💬 自然语言健康答疑
  📊 基础健康数据展示
  🔒 Safety Agent 安全兜底

═══════════════════════════════════════════════════════
V1.0 阶段（5-12周）  目标：产品体验打磨
═══════════════════════════════════════════════════════

[W5-W6] 个性化深化
  - L3 + L4 记忆提炼自动化（Supabase Cron）
  - 用户画像生成（基于历史数据）
  - 订阅体系（¥29/59/99）接入微信支付

[W7-W8] 数据 + 稳定性
  - Android 健康数据接入（华为 HealthKit）
  - LLM 调用成本监控 Dashboard
  - 自动降级系统（DeepSeek → Qwen → Claude）
  - 用户数据导出/删除功能

[W9-W10] 用户增长
  - AI 周报自动生成 + 一键分享
  - 邀请奖励系统
  - 成就徽章体系

[W11-W12] 规模化准备
  - 数据库性能优化（索引 + 查询优化）
  - 多租户隔离验证
  - PMF 验证（D30 留存率 ≥ 25%）

═══════════════════════════════════════════════════════
V2.0 阶段（3-6个月）  目标：竞争壁垒构建
═══════════════════════════════════════════════════════

[M3-M4] 高级记忆
  - L3 知识图谱可视化
  - 跨用户群体模式发现（联邦学习探索）
  - 记忆重要性自动评分

[M4-M5] Multi-Agent 扩展
  - Sleep Agent（独立睡眠分析 Agent）
  - Nutrition Agent（饮食记录 + 建议）
  - Recovery Agent（恢复分析 Agent）
  - Router Agent 智能化升级

[M5-M6] 平台化
  - 开放 API（保险公司 / 企业）
  - Webhook 集成（飞书 / 钉钉 / Apple Health）
  - Health Cloud API 发布

═══════════════════════════════════════════════════════
Health OS 阶段（6-12个月）  长期愿景
═══════════════════════════════════════════════════════

[Year 1 H2]
  - Health OS：开放 Agent 协议，第三方开发者可接入
  - 开发者平台：SDK + 文档 + 沙盒环境
  - B2B2C：企业健康管理 SaaS
  - 硬件生态：与可穿戴设备厂商深度合作
```

### 10.2 关键里程碑与验收标准

| 里程碑 | 时间 | 验收标准 | 关键指标 |
|--------|------|---------|---------|
| MVP 上线 | W4 末 | 10 名员工测试，核心流程跑通 | Morning Brief 生成成功率 ≥ 95% |
| 小规模验证 | W8 末 | 50 名种子用户，D7 留存 ≥ 40% | Safety 0 次生产事故 |
| V1.0 PMF | W12 末 | 200 名用户，D30 留存 ≥ 25% | AI 建议采纳率 ≥ 60% |
| 订阅商业化 | M3 | 月度经常性收入（MRR）> ¥5,000 | 付费转化率 ≥ 3% |
| V2.0 发布 | M6 | Multi-Agent 稳定运行 | LLM 月成本 < ¥500（200用户） |

### 10.3 技术债管理

```markdown
# 技术债追踪（每个 sprint 末review）

## 已知技术债（MVP 后处理）

| 序号 | 问题 | 影响 | 预计修复时间 | 状态 |
|------|------|------|------------|------|
| TD-01 | Mock 数据在生产代码中有残留 | 数据真实性 | 2h | 待处理 |
| TD-02 | Safety Agent LLM 调用未做每日限制 | 成本超支风险 | 4h | 待处理 |
| TD-03 | 没有数据库迁移工具（Supabase migration） | Schema 版本管理 | 2h | 待处理 |
| TD-04 | HealthKit 数据同步无重试机制 | 偶发性数据丢失 | 3h | 待处理 |
| TD-05 | L3/L4 记忆提炼是手动触发 | 记忆系统不完整 | 8h | MVP后处理 |
| TD-06 | 微信登录在 Android 有兼容性问题 | Android 用户无法登录 | 6h | V1.0处理 |

## 规则
- 每个 sprint 最多积累 3 个新 tech debt
- 每个 sprint 必须处理至少 1 个历史 tech debt
- tech debt 超过 10 个时，暂停新功能开发
```

---

## 附录 A：与《可行性研究报告 v5.0》的技术选型对照

| 维度 | 可行性报告（v5.0） | 技术设计文档（v2.0） | 对齐状态 |
|------|------------------|-------------------|---------|
| 数据库 | Supabase | Supabase（PostgreSQL + pgvector） | ✅ 完全一致 |
| Agent 框架 | LangGraph | LangGraph（简化版 MVP） | ✅ 一致 |
| 移动端 | FlutterFlow / 微信小程序 | 微信小程序 / uni-app | ✅ 大方向一致 |
| 主力 LLM | DeepSeek-V3 / Qwen-Max | DeepSeek-V3（主力）+ Qwen-Max（降级） | ✅ 一致 |
| 降级策略 | 未详细说明 | 明确三级降级链 | ✅ 细化了 |
| 极简成本 | ¥750/月 | ¥750/月（含 ¥200 LLM） | ✅ 一致 |
| 部署 | Vercel / Railway | Supabase Cloud | ⚠️ 调整（统一到 Supabase） |
| 记忆系统 | L1-L4 | L1-L4 实现 | ✅ 一致 |

**关于部署平台调整的说明**：
可行性报告中提到"Supabase + Vercel/Railway"，技术设计文档 v2.0 调整为"全部基于 Supabase Cloud"。原因：
- MVP 阶段不需要独立前端部署（小程序直接连 Supabase）
- 减少服务数量，降低运维复杂度（OPC 模式优先）
- Vercel/Railway 费用（¥100-200/月）在 MVP 阶段可节省

---

## 附录 B：OpenRouter API 成本参考

> 注：以下价格为参考价，实际价格以 OpenRouter 官方定价为准（2026年7月）

| 模型 | 输入（$/M tokens） | 输出（$/M tokens） | DeepSeek 参考价 |
|------|-----------------|-----------------|----------------|
| DeepSeek V3 | ~$0.27 | ~$1.10 | ¥0.5/¥1.5 |
| Qwen Max | ~$0.70 | ~$2.80 | ¥2/¥6 |
| Claude 3.5 Sonnet | ~$3.00 | ~$15.00 | ¥3/¥15 |

**MVP 月度 LLM 成本估算（50用户）：**

```
场景：晨间简报 + 3次健康问答/用户/天

用户数：50
每日调用：50 × 4 = 200 次/天
月度调用：200 × 30 = 6,000 次/月

平均 Token 消耗：
- 晨间简报：约 1500 tokens in + 500 out = 2000 tokens
- 健康问答：约 500 tokens in + 200 out = 700 tokens

月度 Token：
- 6,000 × (3/4 晨间 + 1/4 问答) = 4,500 × 2000 + 1,500 × 700 ≈ 9,750,000 tokens

月度成本（DeepSeek-V3 主力）：
  约 ¥200/月 ✅ 在预算内

成本红线：
  - 200 用户 → 约 ¥800/月（需启动订阅收入覆盖）
  - 500 用户 → 约 ¥2,000/月（需要缓存优化或降级）
```

---

*文档版本：v2.0 OPC 专版*
*编写日期：2026-07-23*
*下一步：基于本文档，开始 W1 任务（Supabase 项目初始化）*
