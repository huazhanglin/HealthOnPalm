# Health On Palm (HOP) MVP — W1 详细执行计划

> **阶段目标**：完成基础设施搭建，跑通用户注册 + 登录 + 基本档案流程
> **时间范围**：Day 1 - Day 7（2026-07-24 至 2026-07-30）
> **验收标准**：用户可通过微信小程序完成注册、登录、填写健康档案、查看个人主页
> **日均投入**：2-4 小时（OPC 模式）
>
> **现状修订（2026-08-07）**：  
> - 主验收路径已转为 **iOS App（uni-app + HBuilderX）**，而非仅微信小程序。  
> - 登录已由「手机号 + 验证码」改为 **邮箱 + 密码（注册/登录）**，以降低短信成本。  
> - 下文大量「微信登录 / 手机号 OTP」内容保留为历史决策记录；**当前实现以代码与 W3「中期变更」为准**。

---

## 📋 W1 任务总览

| 任务编号 | 任务名称 | 优先级 | 预计耗时 | 负责人 |
|---------|---------|-------|---------|--------|
| W1-T1 | Supabase 项目初始化 | P0 | 2h | 创始人 |
| W1-T2 | 数据库 Schema 创建 | P0 | 4h | Cursor Agent |
| W1-T3 | RLS 安全策略配置 | P0 | 2h | Cursor Agent |
| W1-T4 | Supabase Auth 配置（微信登录） | P0 | 3h | 创始人 + Agent |
| W1-T5 | uni-app 项目初始化 | P0 | 2h | Cursor Agent |
| W1-T6 | 用户注册/登录页面开发 | P1 | 4h | Cursor Agent |
| W1-T7 | 用户档案页面开发 | P1 | 4h | Cursor Agent |
| W1-T8 | 集成测试 + Bug 修复 | P0 | 4h | 创始人 + Agent |
| **总计** | | | **25h** | |

---

## 📅 Day 1（2026-07-24 周四）

### 目标
完成 Supabase 项目初始化 + 核心数据库 Schema

### 任务清单

#### ✅ T1.1 Supabase 项目初始化（1h）

**步骤：**
1. 访问 [https://supabase.com](https://supabase.com)，注册账号（建议用 GitHub 登录）
2. 创建新项目：
   - 项目名称：`health-agent-mvp`
   - 区域：Singapore（东南亚节点，国内访问相对稳定）
   - 数据库密码：随机生成，保存到 1Password / 本地密码管理器
3. 等待项目初始化完成（约 2-3 分钟）
4. 记录项目配置：
   ```
   Project URL: https://xxxxx.supabase.co
   Anon Key: eyJhbGciOi...
   Service Role Key: eyJhbGciOi...（⚠️ 仅后端使用，不暴露给前端）
   ```
5. 创建 `.env.local` 文件（本地开发用）：
   ```bash
   # .env.local（不提交到 git）
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ```

**验收标准：**
- [ ] Supabase Dashboard 可正常访问
- [ ] 项目 URL 和 API Keys 已记录
- [ ] `.env.local` 文件已创建

**AI 提示词（给 Cursor）：**
```
我刚创建了一个 Supabase 项目，项目信息如下：
- Project URL: https://xxxxx.supabase.co
- Anon Key: [粘贴你的 Key]
- Service Role Key: [粘贴你的 Key]

请帮我：
1. 创建项目的文件夹结构
2. 创建 .env.local 模板文件
3. 创建 .gitignore 文件，确保 .env.local 不会被提交
```

---

#### ✅ T1.2 数据库 Schema — 核心表创建（2h）

**步骤：**
1. 打开 Supabase Dashboard → SQL Editor
2. 按顺序执行以下 SQL 脚本（分 3 次执行，便于调试）

**脚本 1：创建 users 表**
```sql
-- 用户表（Supabase Auth 自动创建 auth.users，我们创建 public.users）
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  -- 基本信息
  nickname TEXT,
  avatar_url TEXT,

  -- 健康档案
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  height_cm NUMERIC(5,2),
  weight_kg NUMERIC(5,2),
  occupation TEXT,
  sleep_goal_hours NUMERIC(3,1) DEFAULT 7.5,

  -- 运动偏好
  fitness_level TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  preferred_workout_time TEXT CHECK (preferred_workout_time IN ('morning', 'noon', 'evening', 'flexible')),
  workout_duration_preference INTEGER,

  -- 订阅状态
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  subscription_expires_at TIMESTAMPTZ,

  -- 元数据
  onboarding_completed BOOLEAN DEFAULT FALSE,
  last_active_at TIMESTAMPTZ DEFAULT now()
);

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_subscription ON public.users(subscription_tier) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_active ON public.users(last_active_at DESC) WHERE deleted_at IS NULL;

-- 注释
COMMENT ON TABLE public.users IS '用户档案表，与 auth.users 一对一关联';
```

**脚本 2：创建 daily_summaries 表**
```sql
-- 每日摘要表
CREATE TABLE IF NOT EXISTS public.daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- 当日汇总数据
  steps INTEGER,
  active_calories NUMERIC(6,2),
  stand_hours NUMERIC(3,1),

  -- AI 分析结果
  ai_brief TEXT,
  ai_plan TEXT,
  ai_recovery_score NUMERIC(3,1) CHECK (ai_recovery_score BETWEEN 0 AND 100),
  ai_workout_readiness TEXT CHECK (ai_workout_readiness IN ('train', 'light', 'rest')),

  -- 反馈数据
  user_feedback TEXT CHECK (user_feedback IN ('adopted', 'ignored', 'modified')),
  user_feedback_note TEXT,

  -- 上下文快照
  context_snapshot JSONB,

  -- 唯一约束
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- 触发器
CREATE TRIGGER daily_summaries_updated_at
  BEFORE UPDATE ON public.daily_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 索引
CREATE INDEX IF NOT EXISTS idx_daily_user_date ON public.daily_summaries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_recovery ON public.daily_summaries(user_id, ai_recovery_score DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.daily_summaries IS '每日健康摘要，每个用户每天一条记录';
```

**脚本 3：创建 health_memories 表（向量记忆）**
```sql
-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 健康记忆向量表
CREATE TABLE IF NOT EXISTS public.health_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- 记忆类型
  memory_type TEXT NOT NULL CHECK (memory_type IN ('working', 'episodic', 'semantic', 'procedural')),

  -- 记忆内容
  content TEXT NOT NULL,
  content_embedding VECTOR(1536),

  -- 元数据
  memory_source TEXT,
  source_id UUID,
  extracted_entities JSONB,
  importance_score NUMERIC(3,1) DEFAULT 5.0,

  -- 过期策略
  expires_at TIMESTAMPTZ,
  compressed BOOLEAN DEFAULT FALSE
);

-- 触发器
CREATE TRIGGER health_memories_updated_at
  BEFORE UPDATE ON public.health_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- pgvector 索引（HNSW，性能最优）
CREATE INDEX IF NOT EXISTS idx_memory_embedding ON public.health_memories
  USING hnsw (content_embedding vector_cosine_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_memory_user_type ON public.health_memories(user_id, memory_type) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.health_memories IS '四层记忆体系：working/episodic/semantic/procedural';
```

**验收标准：**
- [ ] SQL Editor 执行无报错
- [ ] Table Editor 中可以看到 3 张表
- [ ] 每张表的字段、索引、约束与设计一致

**常见问题排查：**
```
Q: 提示 "extension vector not available"
A: Supabase 默认已安装 pgvector，若报错，检查项目是否创建成功，
   或在 Dashboard → Database → Extensions 中手动启用 "vector"

Q: 外键约束报错
A: 确保 auth.users 表已存在（Supabase 自动创建），或先创建 public.users，
   再添加外键约束
```

---

#### ✅ T1.3 创建辅助表（conversations, workout_logs, sleep_logs）（1h）

**在 SQL Editor 中执行：**

```sql
-- 对话记录表
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  messages JSONB DEFAULT '[]'::jsonb,
  message_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,

  context_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_conversation_user_date ON public.conversations(user_id, date DESC);

COMMENT ON TABLE public.conversations IS 'L1 Working Memory，用户对话历史';

-- 运动记录表
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  workout_type TEXT,
  workout_name TEXT,

  duration_minutes INTEGER,
  calories_burned INTEGER,

  perceived_exertion INTEGER CHECK (perceived_exertion BETWEEN 1 AND 10),
  mood_after TEXT CHECK (mood_after IN ('great', 'good', 'normal', 'tired', 'exhausted')),
  notes TEXT,

  source TEXT CHECK (source IN ('user_logged', 'ai_suggested', 'healthkit_sync'))
);

CREATE INDEX IF NOT EXISTS idx_workout_user ON public.workout_logs(user_id, date DESC);

-- 睡眠记录表
CREATE TABLE IF NOT EXISTS public.sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  total_sleep_hours NUMERIC(3,1),
  deep_sleep_hours NUMERIC(3,1),
  light_sleep_hours NUMERIC(3,1),
  rem_sleep_hours NUMERIC(3,1),
  wake_ups INTEGER,

  sleep_quality_score NUMERIC(3,1) CHECK (sleep_quality_score BETWEEN 0 AND 100),
  sleep_start_time TIMESTAMPTZ,
  sleep_end_time TIMESTAMPTZ,

  ai_sleep_insight TEXT,

  source TEXT CHECK (source IN ('healthkit_sync', 'user_logged', 'manual'))
);

CREATE INDEX IF NOT EXISTS idx_sleep_user ON public.sleep_logs(user_id, date DESC);

-- Token 使用日志（成本监控）
CREATE TABLE IF NOT EXISTS public.token_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),

  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  tokens_in INTEGER NOT NULL,
  tokens_out INTEGER NOT NULL,
  cost NUMERIC(8,4) NOT NULL,

  request_type TEXT,
  success BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_token_usage_date ON public.token_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_user ON public.token_usage_logs(user_id) WHERE user_id IS NOT NULL;

COMMENT ON TABLE public.token_usage_logs IS 'LLM Token 使用记录，用于成本监控';
```

**验收标准：**
- [ ] 共 7 张表创建成功（users, daily_summaries, health_memories, conversations, workout_logs, sleep_logs, token_usage_logs）
- [ ] 所有索引创建成功
- [ ] 无 SQL 报错

---

## 📅 Day 2（2026-07-25 周五）

### 目标
完成 RLS 安全策略配置 + Supabase Auth 微信登录配置

### 任务清单

#### ✅ T2.1 RLS 安全策略配置（2h）

**步骤：**
1. 在 SQL Editor 中执行 RLS 启用脚本
2. 为每张表创建 RLS 策略

**RLS 脚本：**

```sql
-- ==========================================
-- 启用 Row Level Security（所有表）
-- ==========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_usage_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 创建辅助函数：获取当前用户 ID
-- ==========================================

CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('request.jwt.claims.sub', true)
  )::UUID;
$$ LANGUAGE SQL STABLE;

-- ==========================================
-- users 表策略
-- ==========================================

-- 用户可以查看自己的档案
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (id = auth.uid());

-- 用户可以更新自己的档案
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- 用户可以插入自己的档案（注册时自动创建）
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

-- ==========================================
-- daily_summaries 表策略
-- ==========================================

CREATE POLICY "Users can view own summaries" ON public.daily_summaries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own summaries" ON public.daily_summaries
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own summaries" ON public.daily_summaries
  FOR UPDATE USING (user_id = auth.uid());

-- ==========================================
-- workout_logs 表策略
-- ==========================================

CREATE POLICY "Users can view own workouts" ON public.workout_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own workouts" ON public.workout_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own workouts" ON public.workout_logs
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own workouts" ON public.workout_logs
  FOR DELETE USING (user_id = auth.uid());

-- ==========================================
-- sleep_logs 表策略
-- ==========================================

CREATE POLICY "Users can view own sleep logs" ON public.sleep_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sleep logs" ON public.sleep_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sleep logs" ON public.sleep_logs
  FOR UPDATE USING (user_id = auth.uid());

-- ==========================================
-- health_memories 表策略
-- ==========================================

CREATE POLICY "Users can view own memories" ON public.health_memories
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own memories" ON public.health_memories
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own memories" ON public.health_memories
  FOR UPDATE USING (user_id = auth.uid());

-- ==========================================
-- conversations 表策略
-- ==========================================

CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own conversations" ON public.conversations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE USING (user_id = auth.uid());

-- ==========================================
-- token_usage_logs 表策略（仅查看）
-- ==========================================

CREATE POLICY "Users can view own token usage" ON public.token_usage_logs
  FOR SELECT USING (user_id = auth.uid());
```

**验收标准：**
- [ ] 所有表已启用 RLS
- [ ] Dashboard → Authentication → Policies 中可以看到所有策略
- [ ] 使用 SQL 测试 RLS 生效：
  ```sql
  -- 测试：未登录用户无法查询 users 表
  SET ROLE anon;
  SELECT * FROM public.users;  -- 应返回空结果或报错

  -- 测试：模拟登录用户
  SET ROLE authenticated;
  SET request.jwt.claims.sub = 'test-user-id';
  SELECT * FROM public.users WHERE id = 'test-user-id';  -- 仅返回自己的数据
  ```

---

#### ✅ T2.2 Supabase Auth 微信登录配置（3h）

**⚠️ 重要说明：**
微信登录需要企业认证（¥300/年）或使用微信开放平台。
MVP 阶段可选择以下方案：

**方案 A（推荐）：微信开放平台 — 网站应用微信登录**
- 适用：H5 网页版（微信内嵌）
- 成本：免费（无需企业认证）
- 流程：用户在微信内打开链接 → 微信授权 → 回调到 Supabase

**方案 B：微信小程序登录**
- 适用：小程序原生
- 成本：个人开发者免费，企业认证 ¥300/年
- 流程：wx.login() → code → 后端换取 openid → Supabase

**方案 C（MVP 最快）：手机号 + 验证码登录**
- 适用：H5 + 小程序
- 成本：Supabase 内置，免费
- 流程：用户输入手机号 → 收到验证码 → 登录成功

**MVP 决策：先用方案 C（手机号验证码），V1.0 再迁移微信登录**

**手机号验证码登录配置步骤：**

1. **开启 Phone Auth**
   - Dashboard → Authentication → Providers
   - 启用 "Phone" provider
   - 配置 SMS provider（Twilio / MessageBird / Supabase 内置）
   - MVP 建议：先用 Supabase 内置测试号码（开发环境）

2. **测试号码（开发环境）**
   ```
   Supabase 提供测试号码：
   手机号：+1 555 555 0000 到 +1 555 555 9999
   验证码：固定 123456

   示例：
   手机号：+1 555 555 1234
   验证码：123456
   ```

3. **配置 JWT Secret（用于生成 Token）**
   - Dashboard → Settings → API
   - 记录 JWT Secret（用于自定义 Token 生成）

**验收标准：**
- [ ] Phone Auth 已启用
- [ ] 测试号码登录成功
- [ ] JWT Token 可正常解析

**AI 提示词（给 Cursor）：**
```
我刚配置了 Supabase Phone Auth，请帮我：

1. 创建一个登录页面组件（Vue 3 + TypeScript）
   - 输入手机号（带国家代码选择器）
   - 点击"发送验证码"按钮
   - 输入验证码
   - 点击"登录"按钮

2. 集成 Supabase Auth API
   - 使用 @supabase/supabase-js v2
   - 调用 supabase.auth.signInWithOtp()
   - 调用 supabase.auth.verifyOtp()

3. 登录成功后：
   - 保存 session 到 localStorage
   - 跳转到主页
   - 显示用户手机号

请生成完整的 Vue 组件代码，包含类型定义和错误处理。
```

---

#### ✅ T2.3 用户注册自动创建 users 记录（1h）

**问题：**
Supabase Auth 只创建 `auth.users`，需要同步创建 `public.users`。

**解决方案：使用 Database Trigger**

```sql
-- 创建触发器函数：当 auth.users 创建时，自动创建 public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, nickname, avatar_url, created_at, last_active_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nickname', NEW.phone),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**验收标准：**
- [ ] 执行触发器脚本无报错
- [ ] 注册新用户后，`public.users` 表自动创建对应记录

**测试方法：**
```sql
-- 1. 注册一个测试用户（使用 Supabase Auth API 或 Dashboard）
-- 2. 查询 public.users
SELECT * FROM public.users WHERE id = '新用户的UUID';
-- 应返回自动创建的记录
```

---

## 📅 Day 3（2026-07-26 周六）

### 目标
完成 uni-app 项目初始化 + 用户注册/登录页面开发

### 任务清单

#### ✅ T3.1 uni-app 项目初始化（2h）

**步骤：**

1. **安装开发工具**
   ```bash
   # 安装 HBuilderX（uni-app 官方 IDE）
   # 下载地址：https://www.dcloud.io/hbuilderx.html

   # 或使用 VS Code + uni-app 插件
   # 推荐使用 HBuilderX（对小程序支持更好）
   ```

2. **创建 uni-app 项目**
   ```bash
   # 方式一：HBuilderX 创建
   # 文件 → 新建 → 项目 → uni-app → 默认模板

   # 方式二：CLI 创建（需要 Node.js）
   npx degit dcloudio/uni-preset-vue#vite-ts health-agent-mvp
   cd health-agent-mvp
   npm install
   ```

3. **安装 Supabase SDK**
   ```bash
   npm install @supabase/supabase-js
   ```

4. **创建项目结构**
   ```
   health-agent-mvp/
   ├── src/
   │   ├── pages/              # 页面
   │   │   ├── index/          # 首页
   │   │   ├── login/          # 登录页
   │   │   ├── profile/        # 个人档案
   │   │   └── onboarding/     # 新手引导
   │   ├── components/         # 组件
   │   │   ├── common/         # 通用组件
   │   │   └── business/       # 业务组件
   │   ├── api/                # API 封装
   │   │   └── supabase.ts     # Supabase 客户端
   │   ├── stores/             # 状态管理（Pinia）
   │   │   └── user.ts         # 用户状态
   │   ├── utils/              # 工具函数
   │   ├── types/              # TypeScript 类型
   │   └── static/             # 静态资源
   ├── .env.local              # 环境变量（不提交）
   ├── .env.development        # 开发环境
   └── manifest.json           # uni-app 配置
   ```

5. **配置 Supabase 客户端**
   ```typescript
   // src/api/supabase.ts
   import { createClient } from '@supabase/supabase-js'

   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

   export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
     auth: {
       autoRefreshToken: true,
       persistSession: true,
       detectSessionInUrl: true
     }
   })
   ```

6. **配置环境变量**
   ```bash
   # .env.development
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

**验收标准：**
- [ ] 项目可正常运行（`npm run dev:h5`）
- [ ] Supabase 客户端可正常调用
- [ ] 项目结构符合设计

---

#### ✅ T3.2 登录页面开发（3h）

**AI 提示词（给 Cursor）：**
```
请帮我创建 HOP 的登录页面（Vue 3 + TypeScript + uni-app）：

页面路径：src/pages/login/index.vue

功能需求：
1. 手机号输入（带国家代码选择器，默认 +86）
2. 发送验证码按钮（60秒倒计时）
3. 验证码输入框（6位数字）
4. 登录按钮
5. 错误提示（Toast）
6. 加载状态（Loading）

技术要求：
- 使用 @supabase/supabase-js
- 调用 supabase.auth.signInWithOtp() 发送验证码
- 调用 supabase.auth.verifyOtp() 验证登录
- 登录成功后跳转到 /pages/index/index
- 使用 Pinia 保存用户状态

UI 设计：
- 简洁、现代
- 顶部 HOP Logo
- 绿色主题（健康感）
- 底部隐私政策链接

请生成完整代码，包含：
1. Vue 组件
2. Pinia store（用户状态）
3. 类型定义（TypeScript）
4. 错误处理
```

**验收标准：**
- [ ] 手机号输入正常
- [ ] 验证码发送成功（使用测试号码 +1 555 555 1234）
- [ ] 登录成功后跳转到首页
- [ ] 用户状态已保存到 Pinia + localStorage

---

#### ✅ T3.3 首页框架搭建（1h）

**AI 提示词（给 Cursor）：**
```
请创建 HOP 的首页框架（Vue 3 + TypeScript + uni-app）：

页面路径：src/pages/index/index.vue

功能需求：
1. 顶部导航栏（显示用户头像 + 昵称）
2. 晨间简报卡片（占位，W2 实现）
3. 今日数据卡片（步数、睡眠、活动时长）
4. AI 对话入口按钮
5. 底部导航栏（首页、记录、我的）

技术要求：
- 使用 uni-app 组件（view, text, image, button）
- 响应式布局（flex）
- 从 Supabase 查询用户数据
- 未登录时跳转到登录页

UI 风格：
- 浅色背景
- 卡片圆角阴影
- 绿色强调色
- 简洁信息密度

请生成完整代码。
```

**验收标准：**
- [ ] 首页框架显示正常
- [ ] 未登录时自动跳转到登录页
- [ ] 登录后显示用户基本信息

---

## 📅 Day 4（2026-07-27 周日）

### 目标
完成用户档案页面 + 新手引导流程

### 任务清单

#### ✅ T4.1 用户档案页面开发（3h）

**AI 提示词（给 Cursor）：**
```
请创建 HOP 的用户档案页面（Vue 3 + TypeScript + uni-app）：

页面路径：src/pages/profile/index.vue

功能需求：
1. 基本信息
   - 头像（点击可上传，暂用默认头像）
   - 昵称（可编辑）
   - 年龄（选择器）
   - 性别（单选：男/女/其他）

2. 健康档案
   - 身高（cm）
   - 体重（kg）
   - 职业（可选输入）
   - 睡眠目标（小时，滑块 6-9h）

3. 运动偏好
   - 运动水平（初级/中级/高级，单选）
   - 偏好训练时间（早晨/中午/晚上/灵活，单选）
   - 偏好训练时长（分钟，滑块 15-60）

4. 保存按钮
   - 点击保存到 Supabase
   - 显示保存成功提示
   - 返回首页

技术要求：
- 使用 uni-app 表单组件
- 表单验证（必填项提示）
- 调用 supabase.from('users').update()
- 加载状态
- 错误处理

UI 设计：
- 分组卡片布局
- 每组一个卡片
- 输入框圆角
- 滑块交互友好

请生成完整代码，包含类型定义。
```

**验收标准：**
- [ ] 所有字段显示正常
- [ ] 数据可保存到 Supabase
- [ ] 表单验证生效
- [ ] 保存成功后显示提示

---

#### ✅ T4.2 新手引导流程（Onboarding）（2h）

**AI 提示词（给 Cursor）：**
```
请创建 HOP 的新手引导流程（Vue 3 + TypeScript + uni-app）：

功能需求：
1. 判断用户是否已完成新手引导
   - 从 Supabase 查询 onboarding_completed 字段
   - 如果 false，跳转到新手引导页

2. 新手引导页（多步骤）
   Step 1: 欢迎页
     - HOP Logo
     - 欢迎文案："每天根据你的身体状态，自动规划下一步行动"
     - 开始按钮

   Step 2: 健康档案
     - 引导填写基础信息（身高、体重、年龄）
     - 必填项提示

   Step 3: 运动偏好
     - 引导选择运动水平
     - 选择偏好训练时间

   Step 4: 授权引导
     - 说明需要健康数据权限
     - 引导授权（MVP 暂跳过，显示"稍后授权"按钮）

   Step 5: 完成
     - 显示"准备就绪"动画
     - 跳转到首页

3. 更新 Supabase
   - 保存用户档案
   - 设置 onboarding_completed = true

技术要求：
- 使用 uni-app swiper 组件实现滑动
- 每个步骤一个 swiper-item
- 进度指示器（圆点）
- 可返回上一步

请生成完整代码。
```

**验收标准：**
- [ ] 新用户首次登录自动进入新手引导
- [ ] 引导流程完整（5个步骤）
- [ ] 数据保存到 Supabase
- [ ] 完成后不再显示引导

---

## 📅 Day 5（2026-07-28 周一）

### 目标
完成 API 封装 + 类型定义 + 状态管理优化

### 任务清单

#### ✅ T5.1 API 层封装（2h）

**创建 API 封装文件：**

```typescript
// src/api/user.ts
import { supabase } from './supabase'
import type { User } from '@/types/database'

export const userApi = {
  // 获取当前用户档案
  async getProfile(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('获取用户档案失败:', error)
      return null
    }

    return data
  },

  // 更新用户档案
  async updateProfile(profile: Partial<User>): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('users')
      .update({
        ...profile,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) {
      console.error('更新用户档案失败:', error)
      return false
    }

    return true
  },

  // 检查是否需要新手引导
  async needsOnboarding(): Promise<boolean> {
    const profile = await this.getProfile()
    return !profile?.onboarding_completed
  }
}
```

```typescript
// src/api/health.ts
import { supabase } from './supabase'
import type { DailySummary, WorkoutLog, SleepLog } from '@/types/database'

export const healthApi = {
  // 获取今日摘要
  async getTodaySummary(): Promise<DailySummary | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = 未找到
      console.error('获取今日摘要失败:', error)
    }

    return data
  },

  // 创建今日摘要
  async createTodaySummary(summary: Partial<DailySummary>): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('daily_summaries')
      .insert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        ...summary
      })

    return !error
  },

  // 获取最近7天运动记录
  async getRecentWorkouts(days: number = 7): Promise<WorkoutLog[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(days)

    if (error) {
      console.error('获取运动记录失败:', error)
      return []
    }

    return data || []
  }
}
```

**验收标准：**
- [ ] API 封装完成
- [ ] 类型定义完整
- [ ] 错误处理统一

---

#### ✅ T5.2 类型定义（1h）

```typescript
// src/types/database.ts

export interface User {
  id: string
  created_at: string
  updated_at: string
  deleted_at?: string

  nickname?: string
  avatar_url?: string

  age?: number
  gender?: 'male' | 'female' | 'other'
  height_cm?: number
  weight_kg?: number
  occupation?: string
  sleep_goal_hours?: number

  fitness_level?: 'beginner' | 'intermediate' | 'advanced'
  preferred_workout_time?: 'morning' | 'noon' | 'evening' | 'flexible'
  workout_duration_preference?: number

  subscription_tier: 'free' | 'pro' | 'premium'
  subscription_expires_at?: string

  onboarding_completed: boolean
  last_active_at: string
}

export interface DailySummary {
  id: string
  created_at: string
  updated_at: string
  deleted_at?: string

  user_id: string
  date: string

  steps?: number
  active_calories?: number
  stand_hours?: number

  ai_brief?: string
  ai_plan?: string
  ai_recovery_score?: number
  ai_workout_readiness?: 'train' | 'light' | 'rest'

  user_feedback?: 'adopted' | 'ignored' | 'modified'
  user_feedback_note?: string

  context_snapshot?: Record<string, any>
}

export interface WorkoutLog {
  id: string
  created_at: string
  deleted_at?: string

  user_id: string
  date: string

  workout_type?: string
  workout_name?: string

  duration_minutes?: number
  calories_burned?: number

  perceived_exertion?: number
  mood_after?: 'great' | 'good' | 'normal' | 'tired' | 'exhausted'
  notes?: string

  source?: 'user_logged' | 'ai_suggested' | 'healthkit_sync'
}

export interface SleepLog {
  id: string
  created_at: string
  deleted_at?: string

  user_id: string
  date: string

  total_sleep_hours?: number
  deep_sleep_hours?: number
  light_sleep_hours?: number
  rem_sleep_hours?: number
  wake_ups?: number

  sleep_quality_score?: number
  sleep_start_time?: string
  sleep_end_time?: string

  ai_sleep_insight?: string

  source?: 'healthkit_sync' | 'user_logged' | 'manual'
}

export interface HealthMemory {
  id: string
  created_at: string
  updated_at: string
  deleted_at?: string

  user_id: string
  memory_type: 'working' | 'episodic' | 'semantic' | 'procedural'

  content: string
  content_embedding?: number[]

  memory_source?: string
  source_id?: string
  extracted_entities?: Record<string, any>
  importance_score?: number

  expires_at?: string
  compressed?: boolean
}

export interface Conversation {
  id: string
  created_at: string
  deleted_at?: string

  user_id: string
  date: string

  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: string
  }>
  message_count: number
  tokens_used: number

  context_summary?: string
}
```

**验收标准：**
- [ ] 所有表类型定义完成
- [ ] TypeScript 编译无错误
- [ ] API 函数使用类型正确

---

#### ✅ T5.3 Pinia Store 优化（1h）

```typescript
// src/stores/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/api/supabase'
import { userApi } from '@/api/user'
import type { User } from '@/types/database'

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const isLoggedIn = computed(() => !!user.value)

  // 登录
  async function login(phone: string, otp: string): Promise<boolean> {
    isLoading.value = true
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms'
      })

      if (error) {
        console.error('登录失败:', error)
        return false
      }

      // 获取用户档案
      const profile = await userApi.getProfile()
      user.value = profile

      return true
    } finally {
      isLoading.value = false
    }
  }

  // 发送验证码
  async function sendOtp(phone: string): Promise<boolean> {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        channel: 'sms'
      }
    })

    if (error) {
      console.error('发送验证码失败:', error)
      return false
    }

    return true
  }

  // 登出
  async function logout() {
    await supabase.auth.signOut()
    user.value = null
  }

  // 更新档案
  async function updateProfile(profile: Partial<User>): Promise<boolean> {
    const success = await userApi.updateProfile(profile)
    if (success && user.value) {
      user.value = { ...user.value, ...profile }
    }
    return success
  }

  // 刷新用户数据
  async function refreshUser() {
    const profile = await userApi.getProfile()
    user.value = profile
  }

  return {
    user,
    isLoading,
    isLoggedIn,
    login,
    sendOtp,
    logout,
    updateProfile,
    refreshUser
  }
})
```

**验收标准：**
- [ ] Pinia Store 可正常使用
- [ ] 状态持久化生效
- [ ] 登录/登出流程正常

---

## 📅 Day 6（2026-07-29 周二）

### 目标
完成基础 UI 组件库 + 样式规范

### 任务清单

#### ✅ T6.1 UI 组件库（3h）

**AI 提示词（给 Cursor）：**
```
请创建 HOP 的基础 UI 组件库（Vue 3 + TypeScript + uni-app）：

组件路径：src/components/common/

需要创建的组件：

1. HaButton（按钮）
   - Props: type (primary/default/text), size (large/medium/small), loading, disabled
   - Slots: default
   - 样式：圆角、绿色主题

2. HaCard（卡片）
   - Props: title, shadow, padding
   - Slots: default, header, footer
   - 样式：白色背景、圆角 12px、阴影

3. HaInput（输入框）
   - Props: type, placeholder, value, disabled, error
   - Events: input, blur, focus
   - 样式：圆角边框、绿色聚焦

4. HaSlider（滑块）
   - Props: min, max, step, value, showValue
   - Events: change
   - 样式：绿色轨道、圆点滑块

5. HaRadioGroup（单选组）
   - Props: options (Array<{label, value}>), value
   - Events: change
   - 样式：圆角按钮组

6. HaLoading（加载）
   - Props: text, fullscreen
   - 样式：旋转动画、居中显示

7. HaToast（提示）
   - Methods: success(text), error(text), warning(text)
   - 样式：圆角、淡入淡出

8. HaAvatar（头像）
   - Props: src, size (large/medium/small), name
   - 样式：圆形、默认头像

技术要求：
- 使用 Vue 3 Composition API
- TypeScript 类型定义
- uni-app 组件封装
- 支持 v-model（输入类组件）
- 样式使用 SCSS

请生成所有组件代码。
```

**验收标准：**
- [ ] 8 个组件全部创建
- [ ] 组件可正常使用
- [ ] 样式符合设计

---

#### ✅ T6.2 全局样式规范（1h）

```scss
// src/styles/variables.scss

// 主题色
$color-primary: #10B981;      // 绿色（健康感）
$color-primary-light: #D1FAE5;
$color-primary-dark: #059669;

// 功能色
$color-success: #10B981;
$color-warning: #F59E0B;
$color-error: #EF4444;
$color-info: #3B82F6;

// 文字色
$color-text-primary: #1F2937;
$color-text-secondary: #6B7280;
$color-text-placeholder: #9CA3AF;
$color-text-disabled: #D1D5DB;

// 背景色
$color-bg-page: #F3F4F6;
$color-bg-card: #FFFFFF;
$color-bg-input: #F9FAFB;

// 边框
$color-border: #E5E7EB;
$color-border-focus: $color-primary;

// 圆角
$border-radius-sm: 8px;
$border-radius-md: 12px;
$border-radius-lg: 16px;
$border-radius-full: 9999px;

// 阴影
$shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
$shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

// 字体
$font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
$font-size-xs: 12px;
$font-size-sm: 14px;
$font-size-base: 16px;
$font-size-lg: 18px;
$font-size-xl: 20px;
$font-size-2xl: 24px;

// 间距
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 12px;
$spacing-lg: 16px;
$spacing-xl: 24px;
$spacing-2xl: 32px;
```

```scss
// src/styles/common.scss

page {
  background-color: $color-bg-page;
  font-family: $font-family;
  font-size: $font-size-base;
  color: $color-text-primary;
  line-height: 1.5;
}

.container {
  padding: $spacing-lg;
}

.card {
  background-color: $color-bg-card;
  border-radius: $border-radius-md;
  box-shadow: $shadow-md;
  padding: $spacing-lg;
  margin-bottom: $spacing-md;
}

.text-primary { color: $color-primary; }
.text-secondary { color: $color-text-secondary; }
.text-center { text-align: center; }
.text-bold { font-weight: bold; }

.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-center { justify-content: center; align-items: center; }
.flex-between { justify-content: space-between; }
.flex-1 { flex: 1; }

.mt-sm { margin-top: $spacing-sm; }
.mt-md { margin-top: $spacing-md; }
.mt-lg { margin-top: $spacing-lg; }
.mb-sm { margin-bottom: $spacing-sm; }
.mb-md { margin-bottom: $spacing-md; }
.mb-lg { margin-bottom: $spacing-lg; }
```

**验收标准：**
- [ ] 样式变量定义完整
- [ ] 通用样式可使用
- [ ] 页面样式统一

---

## 📅 Day 7（2026-07-30 周三）

### 目标
完成集成测试 + Bug 修复 + W1 总结

### 任务清单

#### ✅ T7.1 集成测试（3h）

**测试清单：**

```markdown
## W1 集成测试清单

### 用户注册/登录流程

- [ ] 1.1 打开 App，显示登录页
- [ ] 1.2 输入测试手机号 +1 555 555 1234
- [ ] 1.3 点击"发送验证码"，提示发送成功
- [ ] 1.4 输入验证码 123456
- [ ] 1.5 点击"登录"，跳转到新手引导页
- [ ] 1.6 完成新手引导（填写档案）
- [ ] 1.7 跳转到首页，显示用户昵称
- [ ] 1.8 刷新页面，保持登录状态
- [ ] 1.9 点击"退出登录"，返回登录页

### 用户档案管理

- [ ] 2.1 进入"我的"页面
- [ ] 2.2 点击"编辑档案"
- [ ] 2.3 修改昵称、身高、体重
- [ ] 2.4 点击"保存"，提示保存成功
- [ ] 2.5 刷新页面，数据保持

### 数据库验证

- [ ] 3.1 登录后，Supabase auth.users 表有记录
- [ ] 3.2 public.users 表自动创建对应记录
- [ ] 3.3 档案保存后，public.users 表更新
- [ ] 3.4 RLS 策略生效（用户只能看到自己的数据）

### UI/UX 检查

- [ ] 4.1 所有页面加载正常
- [ ] 4.2 样式统一（绿色主题）
- [ ] 4.3 无样式错乱
- [ ] 4.4 响应式布局正常（不同屏幕尺寸）
- [ ] 4.5 加载状态显示正常
- [ ] 4.6 错误提示友好

### 性能检查

- [ ] 5.1 页面加载时间 < 2秒
- [ ] 5.2 API 响应时间 < 500ms
- [ ] 5.3 无内存泄漏
```

**测试工具：**
- 手动测试（HBuilderX 模拟器 + 真机调试）
- Supabase Dashboard（数据验证）
- Chrome DevTools（网络请求、性能）

---

#### ✅ T7.2 Bug 修复（2h）

**记录和修复发现的 Bug：**

| Bug ID | 描述 | 优先级 | 状态 |
|--------|------|-------|------|
| BUG-001 | 示例 Bug 描述 | High | Open |
| BUG-002 | ... | Medium | Open |

**Bug 修复流程：**
1. 发现 Bug → 记录到表格
2. 复现 Bug
3. 定位原因（使用 Cursor Agent 辅助）
4. 修复代码
5. 验证修复
6. 更新状态为 "Fixed"

---

#### ✅ T7.3 W1 总结与 W2 规划（1h）

**W1 完成情况总结：**

| 任务 | 计划时间 | 实际时间 | 完成度 | 备注 |
|------|---------|---------|-------|------|
| Supabase 初始化 | 2h | | | |
| 数据库 Schema | 4h | | | |
| RLS 策略 | 2h | | | |
| Auth 配置 | 3h | | | |
| uni-app 初始化 | 2h | | | |
| 登录页面 | 4h | | | |
| 档案页面 | 4h | | | |
| 集成测试 | 4h | | | |
| **总计** | **25h** | | | |

**遇到的问题：**
1. ...
2. ...

**学到的经验：**
1. ...
2. ...

**W2 规划预览：**
- Morning Brief Agent（晨间简报）
- HealthKit 数据同步（iOS）
- 基础 Health Data 显示
- 每日推送（定时任务）

---

## 📊 W1 里程碑验收清单

### 必须完成（P0）

- [ ] 用户可通过手机号验证码注册/登录
- [ ] 登录后自动创建 users 记录
- [ ] 用户可填写和保存健康档案
- [ ] 首页显示用户基本信息
- [ ] RLS 策略生效（数据隔离）
- [ ] 所有核心流程无阻塞性 Bug

### 可选完成（P1）

- [ ] 新手引导流程完整
- [ ] UI 组件库完善
- [ ] 性能优化（加载速度 < 2s）
- [ ] 错误监控配置

### 不做（MVP 后处理）

- ❌ 微信登录（V1.0）
- ❌ 真实健康数据同步（W2）
- ❌ AI 功能（W2-W3）
- ❌ 订阅付费（V1.0）

---

## 🛠️ 开发工具清单

| 工具 | 用途 | 安装/访问 |
|------|------|----------|
| **HBuilderX** | uni-app 开发 IDE | [下载地址](https://www.dcloud.io/hbuilderx.html) |
| **VS Code** | 代码编辑器（可选） | [下载地址](https://code.visualstudio.com/) |
| **Cursor** | AI 编程助手 | [下载地址](https://cursor.sh/) |
| **Supabase Dashboard** | 数据库管理 | [访问地址](https://supabase.com/dashboard) |
| **Postman** | API 测试 | [下载地址](https://www.postman.com/) |
| **Chrome DevTools** | 调试工具 | 浏览器内置 |
| **Git** | 版本控制 | `npm install -g git` |

---

## 📚 参考文档

- [Supabase 官方文档](https://supabase.com/docs)
- [uni-app 官方文档](https://uniapp.dcloud.io/)
- [Vue 3 官方文档](https://vuejs.org/)
- [Pinia 官方文档](https://pinia.vuejs.org/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)

---

*文档版本：v1.0*
*创建日期：2026-07-23*
*预计执行：2026-07-24 至 2026-07-30*
