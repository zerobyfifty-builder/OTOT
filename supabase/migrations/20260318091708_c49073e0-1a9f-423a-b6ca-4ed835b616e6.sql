-- Fix BOTH check constraints first
ALTER TABLE public.roles DROP CONSTRAINT roles_role_category_check;
ALTER TABLE public.roles ADD CONSTRAINT roles_role_category_check CHECK (role_category = ANY (ARRAY['god_mode'::text, 'institutional'::text, 'business'::text, 'tourist'::text, 'stakeholder'::text]));

ALTER TABLE public.partner_types DROP CONSTRAINT partner_types_category_check;
ALTER TABLE public.partner_types ADD CONSTRAINT partner_types_category_check CHECK (category = ANY (ARRAY['institutional'::text, 'business'::text, 'stakeholder'::text]));

-- Create all tables
CREATE TABLE public.nurseries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cbo_name text NOT NULL, block_name text NOT NULL, location text,
  capacity integer DEFAULT 0, is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.seed_species (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_name text NOT NULL, certification_source text, category text DEFAULT 'indigenous',
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.seedling_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nursery_id uuid NOT NULL REFERENCES public.nurseries(id) ON DELETE CASCADE,
  species_id uuid NOT NULL REFERENCES public.seed_species(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0, date_sown date, status text DEFAULT 'growing',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.planting_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  block_name text NOT NULL, beat text, species_id uuid REFERENCES public.seed_species(id),
  seedlings_planted integer NOT NULL DEFAULT 0, planter_name text, date_planted date NOT NULL,
  nursery_id uuid REFERENCES public.nurseries(id), latitude numeric, longitude numeric, notes text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.monitoring_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planting_record_id uuid NOT NULL REFERENCES public.planting_records(id) ON DELETE CASCADE,
  measurement_date date NOT NULL, height_cm numeric, survival_count integer, original_count integer,
  survival_rate numeric GENERATED ALWAYS AS (CASE WHEN original_count > 0 THEN (survival_count::numeric / original_count::numeric) * 100 ELSE 0 END) STORED,
  notes text, photos jsonb DEFAULT '[]'::jsonb, created_at timestamptz DEFAULT now()
);
CREATE TABLE public.stakeholder_disbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount numeric NOT NULL, currency text DEFAULT 'KES', disbursement_date date NOT NULL,
  reference text, status text DEFAULT 'pending', reconciled_at timestamptz, notes text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

-- Function
CREATE OR REPLACE FUNCTION public.is_stakeholder(user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.user_id = user_id AND r.name = 'stakeholder'); $$;

-- RLS
ALTER TABLE public.nurseries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seed_species ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seedling_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planting_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stakeholder_disbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_nurseries" ON public.nurseries FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "sh_nurseries" ON public.nurseries FOR ALL USING (is_stakeholder(auth.uid()) AND stakeholder_org_id = get_user_organization(auth.uid())) WITH CHECK (is_stakeholder(auth.uid()) AND stakeholder_org_id = get_user_organization(auth.uid()));
CREATE POLICY "sa_seed_species" ON public.seed_species FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "auth_view_seed_species" ON public.seed_species FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sa_seedling_batches" ON public.seedling_batches FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "sh_seedling_batches" ON public.seedling_batches FOR ALL USING (is_stakeholder(auth.uid()) AND nursery_id IN (SELECT id FROM nurseries WHERE stakeholder_org_id = get_user_organization(auth.uid()))) WITH CHECK (is_stakeholder(auth.uid()) AND nursery_id IN (SELECT id FROM nurseries WHERE stakeholder_org_id = get_user_organization(auth.uid())));
CREATE POLICY "sa_planting_records" ON public.planting_records FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "sh_planting_records" ON public.planting_records FOR ALL USING (is_stakeholder(auth.uid()) AND stakeholder_org_id = get_user_organization(auth.uid())) WITH CHECK (is_stakeholder(auth.uid()) AND stakeholder_org_id = get_user_organization(auth.uid()));
CREATE POLICY "sa_monitoring_records" ON public.monitoring_records FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "sh_monitoring_records" ON public.monitoring_records FOR ALL USING (is_stakeholder(auth.uid()) AND planting_record_id IN (SELECT id FROM planting_records WHERE stakeholder_org_id = get_user_organization(auth.uid()))) WITH CHECK (is_stakeholder(auth.uid()) AND planting_record_id IN (SELECT id FROM planting_records WHERE stakeholder_org_id = get_user_organization(auth.uid())));
CREATE POLICY "sa_disbursements" ON public.stakeholder_disbursements FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "sh_disbursements" ON public.stakeholder_disbursements FOR ALL USING (is_stakeholder(auth.uid()) AND stakeholder_org_id = get_user_organization(auth.uid())) WITH CHECK (is_stakeholder(auth.uid()) AND stakeholder_org_id = get_user_organization(auth.uid()));

-- Data inserts
INSERT INTO public.roles (name, display_name, description, role_category) VALUES ('stakeholder', 'Stakeholder', 'Stakeholder partner with dedicated portal access', 'stakeholder');
INSERT INTO public.partner_types (name, category, description, requires_api, transaction_enabled) VALUES ('Plantation Partner', 'stakeholder', 'Plantation and reforestation partner', false, true);

-- Triggers
CREATE TRIGGER update_nurseries_updated_at BEFORE UPDATE ON public.nurseries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seedling_batches_updated_at BEFORE UPDATE ON public.seedling_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_planting_records_updated_at BEFORE UPDATE ON public.planting_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stakeholder_disbursements_updated_at BEFORE UPDATE ON public.stakeholder_disbursements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();