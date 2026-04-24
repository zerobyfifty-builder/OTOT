INSERT INTO public.org_job_role_defaults (stakeholder_type, job_role, module_name, permissions, sub_features) VALUES
  ('institutional', 'marketing', 'dashboard',       '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb, '{}'::jsonb),
  ('institutional', 'marketing', 'analytics',       '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb, '{}'::jsonb),
  ('institutional', 'marketing', 'reports',         '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb, '{}'::jsonb),
  ('institutional', 'marketing', 'trip_management', '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb, '{}'::jsonb),
  ('institutional', 'marketing', 'tree_orders',     '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb, '{}'::jsonb),
  ('technology',    'marketing', 'dashboard',       '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb, '{}'::jsonb),
  ('technology',    'marketing', 'analytics',       '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb, '{}'::jsonb),
  ('technology',    'marketing', 'reports',         '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb, '{}'::jsonb),
  ('technology',    'marketing', 'trip_management', '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb, '{}'::jsonb),
  ('technology',    'marketing', 'tree_orders',     '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb, '{}'::jsonb),
  ('generic',       'marketing', 'dashboard',       '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb, '{}'::jsonb),
  ('generic',       'marketing', 'analytics',       '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb, '{}'::jsonb),
  ('generic',       'marketing', 'reports',         '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb, '{}'::jsonb),
  ('generic',       'marketing', 'trip_management', '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb, '{}'::jsonb),
  ('generic',       'marketing', 'tree_orders',     '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb, '{}'::jsonb)
ON CONFLICT (stakeholder_type, job_role, module_name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  sub_features = EXCLUDED.sub_features;