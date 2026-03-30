-- Tree geotags table
CREATE TABLE public.tree_geotags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  geo_tag_id text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  geo_accuracy numeric,
  map_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(tree_id)
);

ALTER TABLE public.tree_geotags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_tree_geotags" ON public.tree_geotags FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "sh_tree_geotags" ON public.tree_geotags FOR ALL TO authenticated
  USING (is_stakeholder(auth.uid()))
  WITH CHECK (is_stakeholder(auth.uid()));

-- Tree survival tracking table
CREATE TABLE public.tree_survival_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  survival_status text NOT NULL DEFAULT 'Alive',
  survival_rate numeric,
  last_checked_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.tree_survival_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_tree_survival" ON public.tree_survival_tracking FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "sh_tree_survival" ON public.tree_survival_tracking FOR ALL TO authenticated
  USING (is_stakeholder(auth.uid()))
  WITH CHECK (is_stakeholder(auth.uid()));

-- Tree growth metrics table
CREATE TABLE public.tree_growth_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  growth_stage text NOT NULL DEFAULT 'sapling',
  tree_height text,
  tree_age text,
  photos text[] DEFAULT '{}',
  last_measured_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.tree_growth_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_tree_growth" ON public.tree_growth_metrics FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "sh_tree_growth" ON public.tree_growth_metrics FOR ALL TO authenticated
  USING (is_stakeholder(auth.uid()))
  WITH CHECK (is_stakeholder(auth.uid()));