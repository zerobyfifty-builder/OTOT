
-- Custom roles per organization
CREATE TABLE IF NOT EXISTS public.org_custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'slate',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  mapped_job_role public.org_job_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_custom_roles TO authenticated;
GRANT ALL ON public.org_custom_roles TO service_role;

ALTER TABLE public.org_custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their org roles"
  ON public.org_custom_roles FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Org admins can insert roles"
  ON public.org_custom_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Org admins can update roles"
  ON public.org_custom_roles FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Org admins can delete non-system roles"
  ON public.org_custom_roles FOR DELETE TO authenticated
  USING ((public.is_org_admin(auth.uid(), organization_id) OR public.is_super_admin(auth.uid())) AND is_system = false);

-- updated_at trigger
CREATE TRIGGER trg_org_custom_roles_updated_at
  BEFORE UPDATE ON public.org_custom_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed an "Admin" system role for every existing org
INSERT INTO public.org_custom_roles (organization_id, name, color, description, is_system, mapped_job_role)
SELECT o.id, 'Admin', 'violet', 'Organization administrator', true, 'org_admin'::public.org_job_role
FROM public.organizations o
ON CONFLICT (organization_id, name) DO NOTHING;

-- Auto-seed Admin role for new organizations
CREATE OR REPLACE FUNCTION public.seed_org_admin_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.org_custom_roles (organization_id, name, color, description, is_system, mapped_job_role)
  VALUES (NEW.id, 'Admin', 'violet', 'Organization administrator', true, 'org_admin'::public.org_job_role)
  ON CONFLICT (organization_id, name) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_org_admin_role
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.seed_org_admin_role();

-- Add custom_role_id to org_users for linking
ALTER TABLE public.org_users
  ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES public.org_custom_roles(id) ON DELETE SET NULL;
