INSERT INTO public.modules (name, display_name, description, category, access_type, sort_order, is_active)
VALUES
  ('nurseries', 'Nurseries', 'Manage nurseries and seedling inventory', 'operations', 'scoped', 70, true),
  ('planting', 'Planting', 'Record and manage planting activities', 'operations', 'scoped', 71, true),
  ('monitoring', 'Monitoring', 'Monitor tree growth and survival rates', 'operations', 'scoped', 72, true),
  ('community_impact', 'Community Impact', 'Track community impact metrics', 'operations', 'scoped', 73, true),
  ('outcomes', 'Outcomes', 'View and manage program outcomes', 'reporting', 'scoped', 74, true)
ON CONFLICT DO NOTHING;