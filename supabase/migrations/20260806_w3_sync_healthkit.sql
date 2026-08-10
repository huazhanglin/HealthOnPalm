-- W3-T3.1 HealthKit 同步所需表结构扩展
-- 在 Supabase Dashboard → SQL Editor 中执行本脚本

-- 1) daily_summaries：补充 HealthKit 字段
ALTER TABLE public.daily_summaries
  ADD COLUMN IF NOT EXISTS basal_calories INTEGER,
  ADD COLUMN IF NOT EXISTS exercise_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS resting_heart_rate INTEGER,
  ADD COLUMN IF NOT EXISTS avg_heart_rate INTEGER,
  ADD COLUMN IF NOT EXISTS total_workouts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_distance_meters INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_workout BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'mock';

COMMENT ON COLUMN public.daily_summaries.source IS '数据来源：healthkit / mock / manual';

-- 2) workout_logs：补充 HealthKit 运动明细字段
ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS workout_id TEXT,
  ADD COLUMN IF NOT EXISTS workout_type_id INTEGER,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS distance_meters INTEGER,
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC(8,2);

-- 兼容旧 CHECK：允许 healthkit_sync（W1 已有）；若约束过严可先删再建
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workout_logs_source_check'
  ) THEN
    ALTER TABLE public.workout_logs DROP CONSTRAINT workout_logs_source_check;
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

ALTER TABLE public.workout_logs
  DROP CONSTRAINT IF EXISTS workout_logs_source_check;

ALTER TABLE public.workout_logs
  ADD CONSTRAINT workout_logs_source_check
  CHECK (source IS NULL OR source IN ('user_logged', 'ai_suggested', 'healthkit_sync'));

-- 3) sleep_logs：按用户+日期唯一，便于 upsert
DO $$
BEGIN
  ALTER TABLE public.sleep_logs
    ADD CONSTRAINT sleep_logs_user_date_key UNIQUE (user_id, date);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN unique_violation THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.sleep_logs DROP CONSTRAINT IF EXISTS sleep_logs_source_check;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

ALTER TABLE public.sleep_logs
  DROP CONSTRAINT IF EXISTS sleep_logs_source_check;

ALTER TABLE public.sleep_logs
  ADD CONSTRAINT sleep_logs_source_check
  CHECK (source IS NULL OR source IN ('healthkit_sync', 'user_logged', 'manual'));

-- HealthKit workout uuid 去重（允许手动记录 workout_id 为空）
DO $$
BEGIN
  ALTER TABLE public.workout_logs
    ADD CONSTRAINT workout_logs_user_workout_id_key UNIQUE (user_id, workout_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN unique_violation THEN NULL;
END $$;

-- 4) sync_logs：同步历史
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sync_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'healthkit',
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  record_count INTEGER DEFAULT 0,
  synced_types TEXT[] DEFAULT '{}',
  error_message TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_user_date
  ON public.sync_logs (user_id, sync_date DESC);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users own sync_logs" ON public.sync_logs;
CREATE POLICY "users own sync_logs" ON public.sync_logs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
