-- Add num_trees column
ALTER TABLE public.contribution_tracking ADD COLUMN IF NOT EXISTS num_trees integer NOT NULL DEFAULT 1;

-- Drop the per-tree auto-create trigger (no longer needed - contributions are batch-level)
DROP TRIGGER IF EXISTS trg_auto_create_contribution ON public.trees;
DROP FUNCTION IF EXISTS public.auto_create_contribution();

-- Clear existing per-tree entries and repopulate as batches
DELETE FROM public.contribution_tracking;

-- Reset the sequence
ALTER SEQUENCE contribution_id_seq RESTART WITH 1;

-- Repopulate with batch-level entries (grouped by user, trip, date, payment method)
INSERT INTO public.contribution_tracking (
  tree_id, trip_id, tourist_name, country, num_trees, amount_paid, currency, 
  payment_date, payment_method, plantation_partner_id, status
)
SELECT 
  (array_agg(t.id ORDER BY t.created_at))[1],
  t.trip_id,
  COALESCE(u.first_name || ' ' || u.last_name, u.email),
  u.country,
  count(t.id)::integer,
  sum(t.amount_paid),
  'USD',
  min(t.created_at),
  COALESCE(t.payment_method, 'Card'),
  (array_agg(t.stakeholder_org_id))[1],
  'contribution_received'
FROM public.trees t
LEFT JOIN public.users u ON u.user_id = t.user_id
GROUP BY t.user_id, t.trip_id, t.created_at::date, t.payment_method, u.first_name, u.last_name, u.email, u.country
ORDER BY min(t.created_at);