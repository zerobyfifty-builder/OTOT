ALTER TABLE public.tree_carers
  ADD COLUMN IF NOT EXISTS experience_years integer,
  ADD COLUMN IF NOT EXISTS photo_url text;