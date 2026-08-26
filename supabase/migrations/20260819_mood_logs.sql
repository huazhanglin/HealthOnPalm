-- 每日心情记录（供恢复分 mood 维度使用）
CREATE TABLE IF NOT EXISTS public.mood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood TEXT NOT NULL CHECK (mood IN ('great', 'good', 'normal', 'tired')),
  note TEXT,
  source TEXT NOT NULL DEFAULT 'user_logged'
    CHECK (source IN ('user_logged', 'ai_inferred')),
  CONSTRAINT mood_logs_user_date_key UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_mood_logs_user_date
  ON public.mood_logs (user_id, date DESC)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE public.mood_logs IS '用户每日心情（恢复分 10% 权重）';

ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users own mood_logs" ON public.mood_logs;
CREATE POLICY "users own mood_logs" ON public.mood_logs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_mood_logs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mood_logs_updated_at ON public.mood_logs;
CREATE TRIGGER trg_mood_logs_updated_at
  BEFORE UPDATE ON public.mood_logs
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_mood_logs_updated_at();
