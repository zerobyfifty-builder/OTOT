-- Populate existing tree data into contribution_tracking
INSERT INTO public.contribution_tracking (tree_id, tourist_name, country, trip_id, amount_paid, currency, payment_date, payment_method, plantation_partner_id, status)
SELECT 
  t.id,
  COALESCE(u.first_name || ' ' || u.last_name, u.email),
  u.country,
  t.trip_id,
  t.amount_paid,
  'USD',
  t.created_at,
  COALESCE(t.payment_method, 'Card'),
  t.stakeholder_org_id,
  'contribution_received'
FROM public.trees t
LEFT JOIN public.users u ON u.user_id = t.user_id
ON CONFLICT DO NOTHING;