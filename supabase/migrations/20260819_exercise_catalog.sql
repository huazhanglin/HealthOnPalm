-- 自有动作库（从 wger 精选同步，含中文名与 CC 署名）
-- 在 Supabase Dashboard → SQL Editor 中执行，或 supabase db push

CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 业务键
  slug TEXT NOT NULL,
  wger_id INTEGER,

  -- 名称
  name_en TEXT NOT NULL,
  name_zh TEXT NOT NULL,

  -- 分类与标签（便于按恢复分筛选）
  category TEXT NOT NULL,
  category_zh TEXT NOT NULL,
  -- warmup | main | cooldown | flexible
  movement_phase TEXT NOT NULL DEFAULT 'main'
    CHECK (movement_phase IN ('warmup', 'main', 'cooldown', 'flexible')),
  -- light | moderate | high
  intensity TEXT NOT NULL DEFAULT 'moderate'
    CHECK (intensity IN ('light', 'moderate', 'high')),

  muscles_primary TEXT[] NOT NULL DEFAULT '{}',
  muscles_primary_zh TEXT[] NOT NULL DEFAULT '{}',
  muscles_secondary TEXT[] NOT NULL DEFAULT '{}',
  muscles_secondary_zh TEXT[] NOT NULL DEFAULT '{}',
  equipment TEXT[] NOT NULL DEFAULT '{}',
  equipment_zh TEXT[] NOT NULL DEFAULT '{}',
  is_bodyweight BOOLEAN NOT NULL DEFAULT false,

  description_en TEXT,
  description_zh TEXT,
  image_url TEXT,
  image_thumbnail_url TEXT,

  -- CC-BY-SA 署名与溯源（产品侧展示用）
  source TEXT NOT NULL DEFAULT 'wger',
  license TEXT NOT NULL DEFAULT 'CC-BY-SA-4.0',
  license_url TEXT NOT NULL DEFAULT 'https://creativecommons.org/licenses/by-sa/4.0/',
  license_author TEXT,
  attribution TEXT NOT NULL DEFAULT 'Exercise data adapted from wger.de, licensed under CC BY-SA.',
  source_url TEXT,

  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Agent 默认只用精选子集；全库仍可检索
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  sync_hash TEXT,

  CONSTRAINT exercises_slug_key UNIQUE (slug),
  CONSTRAINT exercises_wger_id_key UNIQUE (wger_id)
);

CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises (category) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_exercises_intensity ON public.exercises (intensity) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_exercises_phase ON public.exercises (movement_phase) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_exercises_bodyweight ON public.exercises (is_bodyweight) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_exercises_featured ON public.exercises (is_featured) WHERE is_active AND is_featured;

COMMENT ON TABLE public.exercises IS '精选健身动作库（源自 wger，CC BY-SA，含中文名）';
COMMENT ON COLUMN public.exercises.attribution IS '面向用户的署名文案，UI 详情页需展示';
COMMENT ON COLUMN public.exercises.wger_id IS '上游 wger exerciseinfo id，便于增量同步';

-- 训练日志可关联动作（闭环打卡，可选）
ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS exercise_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN public.workout_logs.exercise_ids IS '本次训练关联的 exercises.id 列表';

-- 动作库为公共只读目录：登录用户可读；写入仅 service role
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated read exercises" ON public.exercises;
CREATE POLICY "authenticated read exercises" ON public.exercises
  FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "anon read exercises" ON public.exercises;
CREATE POLICY "anon read exercises" ON public.exercises
  FOR SELECT
  TO anon
  USING (is_active = true);

-- updated_at 触发器
CREATE OR REPLACE FUNCTION public.set_exercises_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_exercises_updated_at ON public.exercises;
CREATE TRIGGER trg_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_exercises_updated_at();
