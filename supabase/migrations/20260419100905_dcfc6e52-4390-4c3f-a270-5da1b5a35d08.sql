ALTER TABLE public.community_impact_logs
  ADD COLUMN IF NOT EXISTS reporting_period date,
  ADD COLUMN IF NOT EXISTS families_supported integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS women_employed integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS youth_employed integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nursery_income_kes numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_monthly_income_kes numeric DEFAULT 0;