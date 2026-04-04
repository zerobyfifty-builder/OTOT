
-- Table 1: planting_cost_submissions
CREATE TABLE public.planting_cost_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stakeholder_org text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  cost_seedling_kes numeric(10,2) NOT NULL DEFAULT 0,
  cost_planting_kes numeric(10,2) NOT NULL DEFAULT 0,
  cost_aftercare_yr1_kes numeric(10,2) NOT NULL DEFAULT 0,
  cost_aftercare_yr2_kes numeric(10,2) NOT NULL DEFAULT 0,
  cost_aftercare_yr3_kes numeric(10,2) NOT NULL DEFAULT 0,
  cost_gps_mrv_kes numeric(10,2) NOT NULL DEFAULT 0,
  cost_admin_overhead_kes numeric(10,2) NOT NULL DEFAULT 0,
  total_cost_kes numeric(10,2) NOT NULL DEFAULT 0,
  admin_comment text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.planting_cost_submissions ENABLE ROW LEVEL SECURITY;

-- Plantation stakeholders can view submissions from their org
CREATE POLICY "stakeholders_select_own_submissions"
  ON public.planting_cost_submissions FOR SELECT
  TO authenticated
  USING (
    is_stakeholder(auth.uid())
    OR is_super_admin(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Plantation stakeholders can insert their own submissions
CREATE POLICY "stakeholders_insert_own_submissions"
  ON public.planting_cost_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND (is_stakeholder(auth.uid()) OR is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  );

-- Admins can update all submissions
CREATE POLICY "admins_update_submissions"
  ON public.planting_cost_submissions FOR UPDATE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Table 2: planting_cost_configs
CREATE TABLE public.planting_cost_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.planting_cost_submissions(id) ON DELETE SET NULL,
  is_active boolean DEFAULT false,
  fx_rate_kes_usd numeric(8,2) NOT NULL DEFAULT 130,
  donation_usd numeric(8,2) NOT NULL DEFAULT 10,
  tech_share_pct numeric(5,2) NOT NULL DEFAULT 30,
  ktb_share_of_balance_pct numeric(5,2) NOT NULL DEFAULT 40,
  moe_share_of_balance_pct numeric(5,2) NOT NULL DEFAULT 60,
  tech_usd_per_tree numeric(8,2) NOT NULL DEFAULT 0,
  ktb_usd_per_tree numeric(8,2) NOT NULL DEFAULT 0,
  moe_usd_per_tree numeric(8,2) NOT NULL DEFAULT 0,
  tier_seedling_usd numeric(8,2) NOT NULL DEFAULT 1.00,
  tier_plant_usd numeric(8,2) NOT NULL DEFAULT 0,
  tier_adopt_usd numeric(8,2) NOT NULL DEFAULT 0,
  tier_monthly_usd numeric(8,2) NOT NULL DEFAULT 0,
  tier_yearly_usd numeric(8,2) NOT NULL DEFAULT 0,
  tier_recommit_usd numeric(8,2) NOT NULL DEFAULT 0,
  tier_grove_usd numeric(8,2) NOT NULL DEFAULT 0,
  tier_forest_usd numeric(8,2) NOT NULL DEFAULT 0,
  effective_from timestamptz DEFAULT now(),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.planting_cost_configs ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with configs
CREATE POLICY "admins_all_configs"
  ON public.planting_cost_configs FOR ALL
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  );

-- KTB/institutional users can view active configs only
CREATE POLICY "institutional_select_active_configs"
  ON public.planting_cost_configs FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (is_institutional_partner(auth.uid()) OR is_stakeholder(auth.uid()))
  );

-- Table 3: planting_cost_notifications
CREATE TABLE public.planting_cost_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.planting_cost_submissions(id) ON DELETE CASCADE,
  recipient_role text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.planting_cost_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with notifications
CREATE POLICY "admins_all_notifications"
  ON public.planting_cost_notifications FOR ALL
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Stakeholders can view notifications for their role
CREATE POLICY "stakeholders_select_notifications"
  ON public.planting_cost_notifications FOR SELECT
  TO authenticated
  USING (
    (recipient_role = 'plantation' AND is_stakeholder(auth.uid()))
    OR (recipient_role = 'ktb' AND is_institutional_partner(auth.uid()))
  );

-- System can insert notifications
CREATE POLICY "authenticated_insert_notifications"
  ON public.planting_cost_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update trigger for planting_cost_submissions
CREATE TRIGGER update_planting_cost_submissions_updated_at
  BEFORE UPDATE ON public.planting_cost_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
