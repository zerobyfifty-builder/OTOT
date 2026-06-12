
-- Templates Studio — additive schema (uses is_super_admin for role checks)

DO $$ BEGIN
  CREATE TYPE public.template_status AS ENUM ('draft','pending_approval','approved','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.template_output_kind AS ENUM ('pdf','social');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.template_assignment_scope AS ENUM ('global','partner','portal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. template_categories
CREATE TABLE IF NOT EXISTS public.template_categories (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  output_kind public.template_output_kind NOT NULL,
  merge_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_page_size text NOT NULL DEFAULT 'A4',
  default_orientation text NOT NULL DEFAULT 'landscape',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.template_categories TO authenticated;
GRANT ALL ON public.template_categories TO service_role;
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "template_categories read" ON public.template_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "template_categories write" ON public.template_categories FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_template_categories_updated BEFORE UPDATE ON public.template_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. document_templates
CREATE TABLE IF NOT EXISTS public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key text NOT NULL REFERENCES public.template_categories(key) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  status public.template_status NOT NULL DEFAULT 'draft',
  version int NOT NULL DEFAULT 1,
  is_default boolean NOT NULL DEFAULT false,
  current_design_id uuid,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  parity_confirmed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_document_templates_category ON public.document_templates(category_key);
CREATE INDEX IF NOT EXISTS idx_document_templates_status ON public.document_templates(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_templates TO authenticated;
GRANT ALL ON public.document_templates TO service_role;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_templates read" ON public.document_templates FOR SELECT TO authenticated
  USING (status = 'approved' OR public.is_super_admin(auth.uid()));
CREATE POLICY "document_templates insert" ON public.document_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "document_templates update" ON public.document_templates FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "document_templates delete" ON public.document_templates FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_document_templates_updated BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. template_designs
CREATE TABLE IF NOT EXISTS public.template_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  version int NOT NULL,
  design_json jsonb NOT NULL,
  preview_png_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, version)
);
CREATE INDEX IF NOT EXISTS idx_template_designs_template ON public.template_designs(template_id);
GRANT SELECT, INSERT ON public.template_designs TO authenticated;
GRANT ALL ON public.template_designs TO service_role;
ALTER TABLE public.template_designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "template_designs read" ON public.template_designs FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.document_templates t WHERE t.id = template_designs.template_id AND t.status = 'approved')
  );
CREATE POLICY "template_designs insert" ON public.template_designs FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

ALTER TABLE public.document_templates
  ADD CONSTRAINT document_templates_current_design_fk
  FOREIGN KEY (current_design_id) REFERENCES public.template_designs(id) ON DELETE SET NULL;

-- 4. template_assignments
CREATE TABLE IF NOT EXISTS public.template_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key text NOT NULL REFERENCES public.template_categories(key) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  scope public.template_assignment_scope NOT NULL,
  scope_ref_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 100,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_template_assignments_lookup ON public.template_assignments(category_key, scope, is_active);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_assignments TO authenticated;
GRANT ALL ON public.template_assignments TO service_role;
ALTER TABLE public.template_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "template_assignments read" ON public.template_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "template_assignments write" ON public.template_assignments FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_template_assignments_updated BEFORE UPDATE ON public.template_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. template_engine_flags
CREATE TABLE IF NOT EXISTS public.template_engine_flags (
  category_key text PRIMARY KEY REFERENCES public.template_categories(key) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.template_engine_flags TO authenticated;
GRANT ALL ON public.template_engine_flags TO service_role;
ALTER TABLE public.template_engine_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "template_engine_flags read" ON public.template_engine_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "template_engine_flags write" ON public.template_engine_flags FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_template_engine_flags_updated BEFORE UPDATE ON public.template_engine_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed categories
INSERT INTO public.template_categories (key, label, description, output_kind, merge_fields, default_page_size, default_orientation, sort_order) VALUES
  ('pledge_certificate', 'Pledge Certificate', 'Certificate issued when a tourist takes the pledge.', 'pdf',
    '["userName","date","certificateId","ototId","qrCodeUrl","ktbLogoUrl","partnerLogoUrl"]'::jsonb, 'A4', 'landscape', 10),
  ('tree_certificate', 'Tree Planting Certificate', 'Certificate issued for tree contributions.', 'pdf',
    '["userName","date","certificateId","ototId","numTrees","co2Offset","location","partnerName","qrCodeUrl","ktbLogoUrl","partnerLogoUrl"]'::jsonb, 'A4', 'landscape', 20),
  ('tourist_invoice', 'Tourist Contribution Invoice', 'Receipt for individual tourist contributions.', 'pdf',
    '["userName","date","contributionId","numTrees","amount","currency","paymentMethod","ktbLogoUrl","partnerLogoUrl"]'::jsonb, 'A4', 'portrait', 30),
  ('b2b_invoice', 'B2B Contribution Invoice', 'Invoice for institutional partners.', 'pdf',
    '["orgName","contactName","date","contributionId","numTrees","amount","currency","billTo","ktbLogoUrl","partnerLogoUrl"]'::jsonb, 'A4', 'portrait', 40),
  ('agent_invoice', 'Travel Agent Invoice', 'Invoice for travel agent staff offsets.', 'pdf',
    '["ticketNumber","pnr","lpo","staffName","origin","destination","travelClass","treesNeeded","co2Kg","amountKes","agentBusinessName","agentContact","billToBlock","date"]'::jsonb, 'A4', 'portrait', 50),
  ('lodge_receipt', 'Lodge Receipt', 'Receipt for lodge-driven contributions.', 'pdf',
    '["lodgeName","guestName","date","numTrees","amount","currency"]'::jsonb, 'A4', 'portrait', 60),
  ('social_share_pledge', 'Pledge Share Message', 'Social copy when a tourist shares their pledge.', 'social',
    '["userName","verificationUrl","hashtags"]'::jsonb, 'A4', 'portrait', 70),
  ('social_share_contribution', 'Contribution Share Message', 'Social copy after a contribution.', 'social',
    '["userName","numTrees","co2Offset","verificationUrl","hashtags"]'::jsonb, 'A4', 'portrait', 80),
  ('social_share_generic', 'Generic / Referral Share', 'Generic referral share copy.', 'social',
    '["userName","verificationUrl","hashtags"]'::jsonb, 'A4', 'portrait', 90)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.template_engine_flags (category_key, is_enabled)
SELECT key, false FROM public.template_categories
ON CONFLICT (category_key) DO NOTHING;
