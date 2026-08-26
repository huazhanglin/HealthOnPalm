-- B 方案：全量入库 + Agent 精选子集
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.exercises.is_featured IS 'Agent/今日计划默认候选；全库可搜，精选约 150–200 条';

CREATE INDEX IF NOT EXISTS idx_exercises_featured
  ON public.exercises (is_featured)
  WHERE is_active AND is_featured;
