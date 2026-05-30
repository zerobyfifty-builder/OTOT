ALTER TABLE public.travel_agents
  ADD COLUMN IF NOT EXISTS mobile_number text,
  ADD COLUMN IF NOT EXISTS reference_id text;