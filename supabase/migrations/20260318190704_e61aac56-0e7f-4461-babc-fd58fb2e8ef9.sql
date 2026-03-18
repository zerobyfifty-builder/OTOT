
-- Phase 1a: Add stakeholder_org_id to trees
ALTER TABLE public.trees ADD COLUMN stakeholder_org_id UUID REFERENCES public.organizations(id);

-- Phase 1b: Add fields to stakeholder_disbursements
ALTER TABLE public.stakeholder_disbursements ADD COLUMN tree_count INTEGER DEFAULT 0;
ALTER TABLE public.stakeholder_disbursements ADD COLUMN ktb_transfer_reference TEXT;

-- Phase 1c: Add planting_status enum and column to trees
CREATE TYPE public.planting_progress_type AS ENUM (
  'pending_allocation',
  'allocated', 
  'funds_pending',
  'funds_received',
  'planting_in_progress',
  'planted',
  'monitored'
);
ALTER TABLE public.trees ADD COLUMN planting_status public.planting_progress_type DEFAULT 'pending_allocation';

-- Phase 1d: Community impact table
CREATE TABLE public.community_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_org_id UUID NOT NULL REFERENCES public.organizations(id),
  reporting_period DATE NOT NULL,
  families_supported INTEGER DEFAULT 0,
  jobs_created INTEGER DEFAULT 0,
  women_employed INTEGER DEFAULT 0,
  youth_employed INTEGER DEFAULT 0,
  nursery_income_kes NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.community_impact ENABLE ROW LEVEL SECURITY;

-- RLS: Stakeholders manage their own community impact
CREATE POLICY "sh_community_impact" ON public.community_impact
  FOR ALL USING (
    is_stakeholder(auth.uid()) AND stakeholder_org_id = get_user_organization(auth.uid())
  ) WITH CHECK (
    is_stakeholder(auth.uid()) AND stakeholder_org_id = get_user_organization(auth.uid())
  );

-- RLS: Super admins manage all
CREATE POLICY "sa_community_impact" ON public.community_impact
  FOR ALL USING (is_super_admin(auth.uid()));

-- RLS: Authenticated users can view (for KTB and tourist portals)
CREATE POLICY "auth_view_community_impact" ON public.community_impact
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS: Stakeholders can view trees allocated to them
CREATE POLICY "Stakeholders can view allocated trees" ON public.trees
  FOR SELECT TO authenticated
  USING (is_stakeholder(auth.uid()) AND stakeholder_org_id = get_user_organization(auth.uid()));

-- RLS: Stakeholders can update planting_status on their allocated trees
CREATE POLICY "Stakeholders can update allocated trees" ON public.trees
  FOR UPDATE TO authenticated
  USING (is_stakeholder(auth.uid()) AND stakeholder_org_id = get_user_organization(auth.uid()));

-- RLS: Institutional partners can view disbursements (read-only)
CREATE POLICY "institutional_view_disbursements" ON public.stakeholder_disbursements
  FOR SELECT USING (is_institutional_partner(auth.uid()));

-- RLS: Institutional partners can insert disbursements
CREATE POLICY "institutional_insert_disbursements" ON public.stakeholder_disbursements
  FOR INSERT WITH CHECK (is_institutional_partner(auth.uid()));
