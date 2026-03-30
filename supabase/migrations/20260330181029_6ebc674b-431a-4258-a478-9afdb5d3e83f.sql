
-- Monitoring Logs table
CREATE TABLE public.monitoring_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id text NOT NULL,
  inspection_id text NOT NULL,
  inspection_date date NOT NULL,
  inspected_by text NOT NULL,
  notes text,
  photos text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.monitoring_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_monitoring_logs" ON public.monitoring_logs FOR ALL TO public USING (is_super_admin(auth.uid()));
CREATE POLICY "sh_monitoring_logs" ON public.monitoring_logs FOR ALL TO authenticated USING (is_stakeholder(auth.uid())) WITH CHECK (is_stakeholder(auth.uid()));

-- Impact Metrics table
CREATE TABLE public.impact_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id text NOT NULL,
  co2_offset_estimated numeric DEFAULT 0,
  co2_offset_actual numeric,
  calculation_method text,
  biodiversity_index numeric,
  soil_improvement_indicator text,
  water_retention_indicator text,
  jobs_created integer DEFAULT 0,
  local_participants_count integer DEFAULT 0,
  community_benefits text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.impact_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_impact_metrics" ON public.impact_metrics FOR ALL TO public USING (is_super_admin(auth.uid()));
CREATE POLICY "sh_impact_metrics" ON public.impact_metrics FOR ALL TO authenticated USING (is_stakeholder(auth.uid())) WITH CHECK (is_stakeholder(auth.uid()));
