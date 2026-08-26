-- HealthKit 扩展：步行距离已有 total_distance_meters；补齐心肺/恢复相关字段
ALTER TABLE public.daily_summaries
  ADD COLUMN IF NOT EXISTS max_heart_rate INTEGER,
  ADD COLUMN IF NOT EXISTS walking_hr_avg INTEGER,
  ADD COLUMN IF NOT EXISTS hrv_ms NUMERIC(8,1),
  ADD COLUMN IF NOT EXISTS spo2_percent NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS respiratory_rate NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS flights_climbed INTEGER,
  ADD COLUMN IF NOT EXISTS vo2_max NUMERIC(6,1);

COMMENT ON COLUMN public.daily_summaries.hrv_ms IS '心率变异 SDNN（毫秒），来自 HealthKit';
COMMENT ON COLUMN public.daily_summaries.spo2_percent IS '血氧饱和度百分比';
COMMENT ON COLUMN public.daily_summaries.vo2_max IS '最近一次 VO2 Max（ml/kg/min）';
