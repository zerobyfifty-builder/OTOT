ALTER TABLE public.tree_growth_metrics
  ADD COLUMN IF NOT EXISTS tree_height_cm numeric,
  ADD COLUMN IF NOT EXISTS tree_age_months integer;