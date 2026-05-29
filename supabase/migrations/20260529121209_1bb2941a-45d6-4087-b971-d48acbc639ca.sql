-- Module assignments at the Partner Sub-Category (partner_type) level
CREATE TABLE IF NOT EXISTS public.partner_type_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_type_id UUID NOT NULL REFERENCES public.partner_types(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '["read"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (partner_type_id, module_id)
);

GRANT SELECT ON public.partner_type_modules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_type_modules TO authenticated;
GRANT ALL ON public.partner_type_modules TO service_role;

ALTER TABLE public.partner_type_modules ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read assignments (used by sidebars to build menu)
CREATE POLICY "Authenticated can read partner_type_modules"
  ON public.partner_type_modules FOR SELECT
  TO authenticated
  USING (true);

-- Only super_admin can write
CREATE POLICY "Super admin manages partner_type_modules"
  ON public.partner_type_modules FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_partner_type_modules_updated_at
  BEFORE UPDATE ON public.partner_type_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ptm_partner_type ON public.partner_type_modules(partner_type_id);
CREATE INDEX IF NOT EXISTS idx_ptm_module ON public.partner_type_modules(module_id);