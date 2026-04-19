-- Carbon Metrics Logs
CREATE TABLE public.carbon_metrics_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id text NOT NULL,
  log_date date NOT NULL,
  recorded_by text NOT NULL,
  co2_offset_estimated_kg numeric,
  co2_offset_actual_kg numeric,
  calculation_method text,
  notes text,
  photos text[] DEFAULT '{}'::text[],
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.carbon_metrics_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY sa_carbon_metrics_logs ON public.carbon_metrics_logs FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY sh_carbon_metrics_logs ON public.carbon_metrics_logs FOR ALL TO authenticated USING (is_stakeholder(auth.uid())) WITH CHECK (is_stakeholder(auth.uid()));
CREATE INDEX idx_carbon_metrics_logs_contrib ON public.carbon_metrics_logs(contribution_id);

-- Ecosystem Impact Logs
CREATE TABLE public.ecosystem_impact_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id text NOT NULL,
  log_date date NOT NULL,
  recorded_by text NOT NULL,
  biodiversity_index numeric,
  soil_improvement text,
  water_retention text,
  ecosystem_notes text,
  photos text[] DEFAULT '{}'::text[],
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ecosystem_impact_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY sa_ecosystem_impact_logs ON public.ecosystem_impact_logs FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY sh_ecosystem_impact_logs ON public.ecosystem_impact_logs FOR ALL TO authenticated USING (is_stakeholder(auth.uid())) WITH CHECK (is_stakeholder(auth.uid()));
CREATE INDEX idx_ecosystem_impact_logs_contrib ON public.ecosystem_impact_logs(contribution_id);

-- Community Impact Logs
CREATE TABLE public.community_impact_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id text NOT NULL,
  log_date date NOT NULL,
  recorded_by text NOT NULL,
  jobs_created integer DEFAULT 0,
  local_participants_count integer DEFAULT 0,
  update_frequency text DEFAULT 'Quarterly',
  community_benefits text,
  photos text[] DEFAULT '{}'::text[],
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.community_impact_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY sa_community_impact_logs ON public.community_impact_logs FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY sh_community_impact_logs ON public.community_impact_logs FOR ALL TO authenticated USING (is_stakeholder(auth.uid())) WITH CHECK (is_stakeholder(auth.uid()));
CREATE INDEX idx_community_impact_logs_contrib ON public.community_impact_logs(contribution_id);

-- Triggers for updated_at
CREATE TRIGGER trg_carbon_metrics_logs_updated BEFORE UPDATE ON public.carbon_metrics_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ecosystem_impact_logs_updated BEFORE UPDATE ON public.ecosystem_impact_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_community_impact_logs_updated BEFORE UPDATE ON public.community_impact_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();