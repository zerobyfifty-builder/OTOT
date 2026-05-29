
-- Institutional partner modules
INSERT INTO public.modules (name, display_name, description, category, route, audience, access_type, sort_order, is_active)
VALUES
  ('inst_dashboard',     'Dashboard',            'Institutional dashboard overview',          'reporting',  '/institutional/dashboard',     'partner', 'shared', 100, true),
  ('inst_trips',         'Recent Trips',         'Tourist trips contributing to your org',    'operations', '/institutional/trips',         'partner', 'shared', 101, true),
  ('inst_tree_orders',   'Tree Orders',          'Tree orders attributed to your org',        'operations', '/institutional/trees',         'partner', 'shared', 102, true),
  ('inst_travel_agents', 'Travel Agents',        'Manage travel agent staff & tickets',       'operations', '/institutional/travel-agents', 'partner', 'shared', 103, true),
  ('inst_partners',      'Plantation Partners',  'View linked plantation partners',           'oversight',  '/institutional/partners',      'partner', 'shared', 104, true),
  ('inst_disbursements', 'Disbursements',        'Track disbursements to plantation partners','financial',  '/institutional/disbursements', 'partner', 'shared', 105, true),
  ('inst_reports',       'Reports',              'Generate PDF reports',                      'reporting',  '/institutional/reports',       'partner', 'shared', 106, true),
  ('lodge_dashboard',      'Dashboard',            'Lodge dashboard overview',                'reporting',  '/lodge/dashboard',             'partner', 'shared', 200, true),
  ('lodge_tourists',       'Tourist Assignments',  'Tourists assigned to your lodge',         'operations', '/lodge/tourists',              'partner', 'shared', 201, true),
  ('lodge_trees',          'My Trees',             'Trees being managed at your lodge',       'operations', '/lodge/trees',                 'partner', 'shared', 202, true),
  ('lodge_reimbursements', 'Reimbursements',       'Submit and track reimbursement requests', 'financial',  '/lodge/reimbursements',        'partner', 'shared', 203, true),
  ('lodge_performance',    'View Performance',     'Performance metrics for your lodge',      'reporting',  '/lodge/performance',           'partner', 'shared', 204, true),
  ('lodge_notifications',  'Notifications',        'Inbound notifications for your lodge',    'operations', '/lodge/notifications',         'partner', 'shared', 205, true)
ON CONFLICT (name) DO NOTHING;

-- Backfill institutional modules for existing government partner orgs
INSERT INTO public.organization_modules (organization_id, module_id, is_active, permissions)
SELECT o.id, m.id, true, '["read","write","edit","delete"]'::jsonb
FROM public.organizations o
CROSS JOIN public.modules m
WHERE o.category = 'government'
  AND o.archived = false
  AND m.name LIKE 'inst_%'
  AND NOT EXISTS (SELECT 1 FROM public.organization_modules om WHERE om.organization_id = o.id AND om.module_id = m.id);

-- Backfill lodge modules for existing business partner orgs
INSERT INTO public.organization_modules (organization_id, module_id, is_active, permissions)
SELECT o.id, m.id, true, '["read","write","edit","delete"]'::jsonb
FROM public.organizations o
CROSS JOIN public.modules m
WHERE o.category = 'business'
  AND o.archived = false
  AND m.name LIKE 'lodge_%'
  AND NOT EXISTS (SELECT 1 FROM public.organization_modules om WHERE om.organization_id = o.id AND om.module_id = m.id);
