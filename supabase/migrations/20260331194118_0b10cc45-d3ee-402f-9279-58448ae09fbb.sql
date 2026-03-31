
-- Create tree_planting_assignments table
CREATE TABLE public.tree_planting_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contribution_id TEXT NOT NULL,
  planter_id UUID REFERENCES public.tree_carers(id),
  beat_id UUID REFERENCES public.mdm_location_beats(id),
  nursery_id UUID REFERENCES public.nurseries(id),
  species_id UUID REFERENCES public.seed_species(id),
  assigned_date DATE,
  scheduled_planting_date DATE,
  actual_planting_date DATE,
  sapling_count_allocated INTEGER DEFAULT 0,
  sapling_age_weeks INTEGER,
  soil_type TEXT,
  rainfall_zone TEXT,
  planting_season TEXT,
  land_type TEXT,
  planting_method TEXT,
  community_participants INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tree_monitoring_logs table
CREATE TABLE public.tree_monitoring_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contribution_id TEXT NOT NULL,
  inspection_date DATE NOT NULL,
  inspected_by UUID REFERENCES public.tree_carers(id),
  trees_alive INTEGER DEFAULT 0,
  trees_dead INTEGER DEFAULT 0,
  trees_replaced INTEGER DEFAULT 0,
  survival_rate_pct DECIMAL(5,2),
  overall_health_notes TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tree_survival_records table
CREATE TYPE public.survival_status_type AS ENUM ('Alive', 'Dead', 'Replaced');
CREATE TYPE public.growth_stage_type AS ENUM ('Sapling', 'Young', 'Maturing', 'Mature');

CREATE TABLE public.tree_survival_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tree_id UUID REFERENCES public.trees(id) ON DELETE CASCADE,
  contribution_id TEXT NOT NULL,
  survival_status survival_status_type DEFAULT 'Alive',
  growth_stage growth_stage_type DEFAULT 'Sapling',
  height_cm DECIMAL(8,2),
  last_checked_date DATE,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tree_impact_records table
CREATE TYPE public.update_frequency_type AS ENUM ('Monthly', 'Quarterly', 'Annually');
CREATE TYPE public.notification_status_type AS ENUM ('Pending', 'Scheduled', 'Sent');

CREATE TABLE public.tree_impact_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contribution_id TEXT NOT NULL UNIQUE,
  co2_offset_estimated_kg DECIMAL(10,2),
  co2_offset_actual_kg DECIMAL(10,2),
  calculation_method TEXT,
  biodiversity_index DECIMAL(4,2),
  soil_improvement TEXT,
  water_retention TEXT,
  jobs_created INTEGER DEFAULT 0,
  local_participants_count INTEGER DEFAULT 0,
  community_benefits TEXT,
  ecosystem_notes TEXT,
  certificate_id TEXT,
  certificate_url TEXT,
  certificate_issued_date DATE,
  last_update_sent_date DATE,
  update_frequency update_frequency_type DEFAULT 'Quarterly',
  notification_status notification_status_type DEFAULT 'Pending',
  anniversary_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.tree_planting_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_monitoring_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_survival_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_impact_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for tree_planting_assignments
CREATE POLICY "sa_tree_planting_assignments" ON public.tree_planting_assignments FOR ALL TO public USING (is_super_admin(auth.uid()));
CREATE POLICY "sh_tree_planting_assignments" ON public.tree_planting_assignments FOR ALL TO authenticated USING (is_stakeholder(auth.uid())) WITH CHECK (is_stakeholder(auth.uid()));

-- RLS policies for tree_monitoring_logs
CREATE POLICY "sa_tree_monitoring_logs" ON public.tree_monitoring_logs FOR ALL TO public USING (is_super_admin(auth.uid()));
CREATE POLICY "sh_tree_monitoring_logs" ON public.tree_monitoring_logs FOR ALL TO authenticated USING (is_stakeholder(auth.uid())) WITH CHECK (is_stakeholder(auth.uid()));

-- RLS policies for tree_survival_records
CREATE POLICY "sa_tree_survival_records" ON public.tree_survival_records FOR ALL TO public USING (is_super_admin(auth.uid()));
CREATE POLICY "sh_tree_survival_records" ON public.tree_survival_records FOR ALL TO authenticated USING (is_stakeholder(auth.uid())) WITH CHECK (is_stakeholder(auth.uid()));

-- RLS policies for tree_impact_records
CREATE POLICY "sa_tree_impact_records" ON public.tree_impact_records FOR ALL TO public USING (is_super_admin(auth.uid()));
CREATE POLICY "sh_tree_impact_records" ON public.tree_impact_records FOR ALL TO authenticated USING (is_stakeholder(auth.uid())) WITH CHECK (is_stakeholder(auth.uid()));
