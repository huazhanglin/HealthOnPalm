-- init.sql -- 完整初始化脚本

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 用户表（含合规字段）
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    avatar_url VARCHAR(500),

    -- 订阅状态
    is_premium BOOLEAN DEFAULT FALSE,
    premium_expires_at TIMESTAMP,

    -- 合规字段
    consent_version VARCHAR(20),
    consent_at TIMESTAMP,
    deleted_at TIMESTAMP,
    last_login_at TIMESTAMP,

    -- 状态
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 对话历史表（含成本追踪）
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    intent VARCHAR(50),

    -- 成本追踪字段
    model_used VARCHAR(50),
    input_tokens INTEGER,
    output_tokens INTEGER,
    response_time_ms INTEGER,
    is_cached BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 健康数据表（敏感字段加密存储 + 合规字段）
-- =============================================
CREATE TABLE IF NOT EXISTS health_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- 健康数据（加密 JSON 存储）
    data_encrypted BYTEA,

    -- 元数据
    data_source VARCHAR(20) NOT NULL DEFAULT 'health_kit',
    consent_version VARCHAR(20),

    -- 合规字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    UNIQUE(user_id, date)
);

-- =============================================
-- 训练计划表
-- =============================================
CREATE TABLE IF NOT EXISTS training_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    goal VARCHAR(50),
    duration_weeks INTEGER,

    plan_content JSONB,

    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 索引（PostgreSQL 用 CREATE INDEX，不写在 CREATE TABLE 内）
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_user_created ON messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_user_date ON health_data (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_health_deleted_at ON health_data (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plans_user_active ON training_plans (user_id, is_active);
