
CREATE TABLE public.org_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES public.org_custom_roles(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  permissions JSONB NOT NULL DEFAULT '{"read":true,"write":false,"edit":false,"delete":false}'::jsonb,
  sub_features JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_id, module_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_role_permissions TO authenticated;
GRANT ALL ON public.org_role_permissions TO service_role;

ALTER TABLE public.org_role_permissions ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user in the same org (so useModulePermissions can resolve their own role)
CREATE POLICY "Org members can read role permissions"
ON public.org_role_permissions
FOR SELECT
TO authenticated
USING (
  public.users_in_same_org(auth.uid(), auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.user_id = auth.uid() AND u.organization_id = org_role_permissions.organization_id
  )
  OR EXISTS (
    SELECT 1 FROM public.org_users ou
    WHERE ou.user_id = auth.uid()
      AND ou.organization_id = org_role_permissions.organization_id
      AND ou.status = 'active'
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Org admins manage role permissions - insert"
ON public.org_role_permissions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_org_admin(auth.uid(), organization_id) OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Org admins manage role permissions - update"
ON public.org_role_permissions
FOR UPDATE
TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()))
WITH CHECK (public.is_org_admin(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Org admins manage role permissions - delete"
ON public.org_role_permissions
FOR DELETE
TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_org_role_permissions_updated_at
BEFORE UPDATE ON public.org_role_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_org_role_permissions_role ON public.org_role_permissions(role_id);
CREATE INDEX idx_org_role_permissions_org ON public.org_role_permissions(organization_id);
