ALTER TABLE public.community_impact_logs
  ADD COLUMN IF NOT EXISTS reporting_period_end date;