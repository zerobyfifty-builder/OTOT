ALTER TABLE public.contribution_tracking
ADD COLUMN IF NOT EXISTS tech_fee_received numeric DEFAULT 0;