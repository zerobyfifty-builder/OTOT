-- Enums
DO $$ BEGIN
  CREATE TYPE public.org_job_role AS ENUM (
    'field_ops','expert','operations_manager','project_manager',
    'community_coordinator','impact_analyst','finance','org_admin','user'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.org_user_status AS ENUM ('pending','active','deactivated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- org_users
CREATE TABLE IF NOT EXISTS public.org_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  position TEXT,
  job_role public.org_job_role NOT NULL,
  status public.org_user_status NOT NULL DEFAULT 'pending',
  personal_message TEXT,
  invited_by UUID,
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_org_users_org ON public.org_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_users_user ON public.org_users(user_id);

-- org_user_permissions
CREATE TABLE IF NOT EXISTS public.org_user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_user_id UUID NOT NULL REFERENCES public.org_users(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb,
  sub_features JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_user_id, module_name)
);

CREATE INDEX IF NOT EXISTS idx_org_user_perms_user ON public.org_user_permissions(org_user_id);

-- org_job_role_defaults (seed table)
CREATE TABLE IF NOT EXISTS public.org_job_role_defaults (
  stakeholder_type TEXT NOT NULL,
  job_role public.org_job_role NOT NULL,
  module_name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb,
  sub_features JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (stakeholder_type, job_role, module_name)
);

-- Triggers
CREATE TRIGGER trg_org_users_updated
  BEFORE UPDATE ON public.org_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_org_user_perms_updated
  BEFORE UPDATE ON public.org_user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: is_org_admin
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_users ou
    WHERE ou.user_id = _user_id
      AND ou.organization_id = _org_id
      AND ou.job_role = 'org_admin'
      AND ou.status = 'active'
  ) OR EXISTS (
    -- Fallback: super_admin or stakeholder owner of the org (no org_users row yet)
    SELECT 1 FROM public.users u
    WHERE u.user_id = _user_id
      AND u.organization_id = _org_id
  );
$$;

-- Enable RLS
ALTER TABLE public.org_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_job_role_defaults ENABLE ROW LEVEL SECURITY;

-- Policies: org_users
CREATE POLICY "Org admins manage org members"
  ON public.org_users FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Members read own row"
  ON public.org_users FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Super admins full access org_users"
  ON public.org_users FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Policies: org_user_permissions
CREATE POLICY "Org admins manage perms"
  ON public.org_user_permissions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.org_users ou
    WHERE ou.id = org_user_id
      AND public.is_org_admin(auth.uid(), ou.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.org_users ou
    WHERE ou.id = org_user_id
      AND public.is_org_admin(auth.uid(), ou.organization_id)
  ));

CREATE POLICY "Members read own perms"
  ON public.org_user_permissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.org_users ou
    WHERE ou.id = org_user_id AND ou.user_id = auth.uid()
  ));

-- Policies: org_job_role_defaults (read by all authenticated)
CREATE POLICY "Authenticated read role defaults"
  ON public.org_job_role_defaults FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Super admins manage role defaults"
  ON public.org_job_role_defaults FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Register org_users module
INSERT INTO public.modules (name, display_name, description, category, icon, route, access_type, is_active, sort_order)
VALUES (
  'org_users','Users','Manage organization members and their permissions',
  'oversight','Users','/stakeholder/settings?tab=users','scoped',true,90
) ON CONFLICT (name) DO NOTHING;

-- Seed role defaults
-- Helper jsonb shortcuts
-- All-permissions
-- {"read":true,"write":true,"edit":true,"delete":true}

-- ===== Plantation defaults =====
-- Admin: all org modules with full perms (gets all-modules entry handled in code; seed key modules)
INSERT INTO public.org_job_role_defaults (stakeholder_type, job_role, module_name, permissions, sub_features) VALUES
  ('plantation','org_admin','*','{"read":true,"write":true,"edit":true,"delete":true}'::jsonb,
   '{"tree_orders.slider.carbon":true,"tree_orders.slider.ecosystem":true,"tree_orders.slider.community":true,"tree_orders.action.status_transition":true,"tree_orders.action.send_update":true}'::jsonb),

  ('plantation','field_ops','tree_orders','{"read":true,"write":false,"edit":true,"delete":false}'::jsonb,
   '{"tree_orders.action.status_transition":true}'::jsonb),
  ('plantation','field_ops','tree_management','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,'{}'::jsonb),
  ('plantation','field_ops','planting','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,'{}'::jsonb),

  ('plantation','expert','tree_orders','{"read":true,"write":false,"edit":true,"delete":false}'::jsonb,
   '{"tree_orders.slider.carbon":true,"tree_orders.slider.ecosystem":true}'::jsonb),
  ('plantation','expert','mdm_species','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,'{}'::jsonb),
  ('plantation','expert','mdm_sequestration','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,'{}'::jsonb),

  ('plantation','operations_manager','tree_orders','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,
   '{"tree_orders.slider.carbon":true,"tree_orders.action.status_transition":true}'::jsonb),
  ('plantation','operations_manager','mdm_nurseries','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,'{}'::jsonb),
  ('plantation','operations_manager','mdm_planters','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,'{}'::jsonb),
  ('plantation','operations_manager','mdm_forest_locations','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,'{}'::jsonb),

  ('plantation','project_manager','dashboard','{"read":true,"write":false,"edit":false,"delete":false}'::jsonb,'{}'::jsonb),
  ('plantation','project_manager','trip_management','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,'{}'::jsonb),
  ('plantation','project_manager','tree_orders','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,
   '{"tree_orders.slider.carbon":true,"tree_orders.slider.ecosystem":true,"tree_orders.slider.community":true}'::jsonb),
  ('plantation','project_manager','analytics','{"read":true,"write":false,"edit":false,"delete":false}'::jsonb,'{}'::jsonb),

  ('plantation','community_coordinator','tree_orders','{"read":true,"write":false,"edit":true,"delete":false}'::jsonb,
   '{"tree_orders.slider.community":true}'::jsonb),

  ('plantation','impact_analyst','impact_insights','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,'{}'::jsonb),
  ('plantation','impact_analyst','outcomes','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,'{}'::jsonb),
  ('plantation','impact_analyst','tree_orders','{"read":true,"write":false,"edit":true,"delete":false}'::jsonb,
   '{"tree_orders.slider.ecosystem":true}'::jsonb),

  ('plantation','finance','financial','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,'{}'::jsonb),
  ('plantation','finance','payment_management','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,'{}'::jsonb),
  ('plantation','finance','planting_costs','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,'{}'::jsonb)
ON CONFLICT DO NOTHING;

-- ===== Generic (institutional / technology / other) defaults =====
INSERT INTO public.org_job_role_defaults (stakeholder_type, job_role, module_name, permissions, sub_features) VALUES
  ('generic','org_admin','*','{"read":true,"write":true,"edit":true,"delete":true}'::jsonb,'{}'::jsonb),

  ('generic','finance','financial','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,'{}'::jsonb),
  ('generic','finance','payment_management','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,'{}'::jsonb),
  ('generic','finance','planting_costs','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,'{}'::jsonb),

  ('generic','project_manager','dashboard','{"read":true,"write":false,"edit":false,"delete":false}'::jsonb,'{}'::jsonb),
  ('generic','project_manager','trip_management','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,'{}'::jsonb),
  ('generic','project_manager','tree_orders','{"read":true,"write":true,"edit":true,"delete":false}'::jsonb,
   '{"tree_orders.slider.carbon":true,"tree_orders.slider.ecosystem":true,"tree_orders.slider.community":true}'::jsonb),
  ('generic','project_manager','analytics','{"read":true,"write":false,"edit":false,"delete":false}'::jsonb,'{}'::jsonb),
  ('generic','project_manager','reports','{"read":true,"write":true,"edit":false,"delete":false}'::jsonb,'{}'::jsonb),

  ('generic','user','dashboard','{"read":true,"write":false,"edit":false,"delete":false}'::jsonb,'{}'::jsonb),
  ('generic','user','tree_orders','{"read":true,"write":false,"edit":false,"delete":false}'::jsonb,'{}'::jsonb)
ON CONFLICT DO NOTHING;