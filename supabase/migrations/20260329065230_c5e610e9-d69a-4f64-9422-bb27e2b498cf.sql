ALTER TABLE public.nurseries
  ADD COLUMN IF NOT EXISTS nursery_type text,
  ADD COLUMN IF NOT EXISTS zip_code text,
  ADD COLUMN IF NOT EXISTS manager_email text,
  ADD COLUMN IF NOT EXISTS kefri_reg_no text;