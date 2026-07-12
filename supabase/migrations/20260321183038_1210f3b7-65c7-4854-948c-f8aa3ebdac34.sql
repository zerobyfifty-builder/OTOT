-- Update existing status values to new naming convention
UPDATE public.contribution_tracking SET status = 'contribution_confirmed' WHERE status = 'contribution_received';
UPDATE public.contribution_tracking SET status = 'funds_received' WHERE status = 'ktb_received';
UPDATE public.contribution_tracking SET status = 'received_for_planting' WHERE status = 'partner_confirmed';

-- Insert the missing 11-tree batch contribution for heyramsenthil@gmail.com.
-- Guarded: only runs when the referenced tree exists (production). No-op on a
-- fresh/local database so the schema still applies cleanly.
INSERT INTO public.contribution_tracking (
  tree_id, trip_id, tourist_name, country, num_trees, amount_paid, currency,
  payment_date, payment_method, status
)
SELECT
  '1e6479ea-9510-49b8-9ce4-4a0873c05605',
  '14f3d2e9-5301-4de3-a87e-977ae3f1529d',
  'Ram Senthil',
  'India',
  11,
  49.50,
  'USD',
  '2026-03-21 18:09:07.672368+00',
  'M-Pesa',
  'contribution_confirmed'
WHERE EXISTS (
  SELECT 1 FROM public.trees WHERE id = '1e6479ea-9510-49b8-9ce4-4a0873c05605'
);