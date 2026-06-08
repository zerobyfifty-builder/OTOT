
ALTER TABLE public.modules DROP CONSTRAINT IF EXISTS modules_audience_check;
ALTER TABLE public.modules ADD CONSTRAINT modules_audience_check
  CHECK (audience = ANY (ARRAY['owner','partner','tourist','both']));

ALTER TABLE public.modules DROP CONSTRAINT IF EXISTS modules_category_check;
ALTER TABLE public.modules ADD CONSTRAINT modules_category_check
  CHECK (category = ANY (ARRAY['financial','master_data','operations','oversight','reporting','configuration','tourist']));

INSERT INTO public.modules (name, display_name, category, audience, access_type, is_active, sort_order)
VALUES
  ('tourist_dashboard',     'Dashboard',         'tourist', 'tourist', 'shared', true, 1),
  ('tourist_my_trips',      'My Trips',          'tourist', 'tourist', 'shared', true, 2),
  ('tourist_my_trees',      'My Trees',          'tourist', 'tourist', 'shared', true, 3),
  ('tourist_carbon_calc',   'Carbon Calculator', 'tourist', 'tourist', 'shared', true, 4),
  ('tourist_pledge',        'Pledge',            'tourist', 'tourist', 'shared', true, 5),
  ('tourist_profile',       'Profile',           'tourist', 'tourist', 'shared', true, 6),
  ('tourist_tree_purchase', 'Tree Purchase',     'tourist', 'tourist', 'shared', true, 7)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tourist_module_permissions (
  module_id uuid PRIMARY KEY REFERENCES public.modules(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  permissions jsonb NOT NULL DEFAULT '{"read":true,"write":true,"edit":true,"delete":true}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.tourist_module_permissions TO anon, authenticated;
GRANT ALL ON public.tourist_module_permissions TO service_role;
ALTER TABLE public.tourist_module_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tmp_read_all" ON public.tourist_module_permissions;
CREATE POLICY "tmp_read_all" ON public.tourist_module_permissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "tmp_write_superadmin" ON public.tourist_module_permissions;
CREATE POLICY "tmp_write_superadmin" ON public.tourist_module_permissions FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.module_sub_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, key)
);
GRANT SELECT ON public.module_sub_actions TO anon, authenticated;
GRANT ALL ON public.module_sub_actions TO service_role;
ALTER TABLE public.module_sub_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "msa_read_all" ON public.module_sub_actions;
CREATE POLICY "msa_read_all" ON public.module_sub_actions FOR SELECT USING (true);
DROP POLICY IF EXISTS "msa_write_superadmin" ON public.module_sub_actions;
CREATE POLICY "msa_write_superadmin" ON public.module_sub_actions FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.tourist_sub_action_permissions (
  sub_action_id uuid PRIMARY KEY REFERENCES public.module_sub_actions(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.tourist_sub_action_permissions TO anon, authenticated;
GRANT ALL ON public.tourist_sub_action_permissions TO service_role;
ALTER TABLE public.tourist_sub_action_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tsap_read_all" ON public.tourist_sub_action_permissions;
CREATE POLICY "tsap_read_all" ON public.tourist_sub_action_permissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "tsap_write_superadmin" ON public.tourist_sub_action_permissions;
CREATE POLICY "tsap_write_superadmin" ON public.tourist_sub_action_permissions FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

WITH m AS (SELECT id, name FROM public.modules WHERE audience='tourist')
INSERT INTO public.module_sub_actions (module_id, key, label, sort_order)
SELECT m.id, s.key, s.label, s.sort_order FROM m
JOIN (VALUES
  ('tourist_dashboard',     'hero_stats',                     'Hero Stats',                 1),
  ('tourist_dashboard',     'pledge_carousel',                'Pledge Carousel',            2),
  ('tourist_dashboard',     'recent_contributions',           'Recent Contributions',       3),
  ('tourist_my_trips',      'create_trip',                    'Create Trip',                1),
  ('tourist_my_trips',      'delete_trip',                    'Delete Trip',                2),
  ('tourist_my_trips',      'export_pdf',                     'Export PDF',                 3),
  ('tourist_my_trees',      'view_individual_trees_accordion','View Individual Trees Accordion', 1),
  ('tourist_my_trees',      'download_certificate',           'Download Certificate',       2),
  ('tourist_my_trees',      'share_socially',                 'Share Socially',             3),
  ('tourist_my_trees',      'map_view',                       'Map View',                   4),
  ('tourist_carbon_calc',   'flight_offset',                  'Flight Offset',              1),
  ('tourist_carbon_calc',   'accommodation_offset',           'Accommodation Offset',       2),
  ('tourist_pledge',        'create_pledge',                  'Create Pledge',              1),
  ('tourist_pledge',        'edit_pledge',                    'Edit Pledge',                2),
  ('tourist_pledge',        'share_pledge',                   'Share Pledge',               3),
  ('tourist_profile',       'edit_profile',                   'Edit Profile',               1),
  ('tourist_profile',       'change_password',                'Change Password',            2),
  ('tourist_tree_purchase', 'one_time',                       'One-time Purchase',          1),
  ('tourist_tree_purchase', 'subscription',                   'Subscription',               2)
) AS s(module_name, key, label, sort_order) ON s.module_name = m.name
ON CONFLICT (module_id, key) DO NOTHING;
