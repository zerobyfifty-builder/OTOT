
-- TABLE 1: tree_sequestration_rates
CREATE TABLE public.tree_sequestration_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_name text NOT NULL,
  scientific_name text,
  species_category text NOT NULL CHECK (species_category IN ('indigenous', 'exotic', 'fruit', 'bamboo')),
  rate_kg_per_year_min numeric(8,2),
  rate_kg_per_year_max numeric(8,2),
  rate_kg_per_year_default numeric(8,2) NOT NULL,
  survival_rate_override numeric(5,4),
  offset_horizon_years integer NOT NULL DEFAULT 20,
  data_source text,
  source_year integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tree_sequestration_rates ENABLE ROW LEVEL SECURITY;

-- RLS: All authenticated can SELECT
CREATE POLICY "Authenticated users can view sequestration rates"
  ON public.tree_sequestration_rates
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS: Admin can INSERT
CREATE POLICY "Admins can insert sequestration rates"
  ON public.tree_sequestration_rates
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- RLS: Admin can UPDATE
CREATE POLICY "Admins can update sequestration rates"
  ON public.tree_sequestration_rates
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- RLS: Admin can DELETE
CREATE POLICY "Admins can delete sequestration rates"
  ON public.tree_sequestration_rates
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Auto-update updated_at trigger
CREATE TRIGGER update_tree_sequestration_rates_updated_at
  BEFORE UPDATE ON public.tree_sequestration_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data
INSERT INTO public.tree_sequestration_rates
  (species_name, scientific_name, species_category, rate_kg_per_year_min, rate_kg_per_year_max, rate_kg_per_year_default, survival_rate_override, offset_horizon_years, data_source, source_year, is_active)
VALUES
  ('Generic mix (OTOT default)', NULL, 'indigenous', 22, 22, 22, NULL, 20, 'ICAO v13.1; OTOT Carbon PRD', 2024, true),
  ('Indigenous hardwoods', 'Olea africana / Croton megalocarpus / Podocarpus spp.', 'indigenous', 15, 18, 16.5, 0.88, 20, 'KEFRI highland forest data', 2023, true),
  ('Exotic fast-growing', 'Grevillea robusta / Eucalyptus spp.', 'exotic', 28, 35, 31.5, 0.82, 20, 'FAO Africa forestry report', 2022, true),
  ('Fruit trees (grafted)', 'Persea americana / Mangifera indica', 'fruit', 12, 16, 14, 0.80, 20, 'Agroforestry Kenya studies', 2023, true),
  ('Bamboo', 'Yushania alpina', 'bamboo', 50, 60, 55, 0.90, 10, 'INBAR bamboo carbon study', 2023, true);

-- TABLE 2: carbon_offset_calculations
CREATE TABLE public.carbon_offset_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid,
  flight_legs_json jsonb NOT NULL,
  total_co2_kg numeric(10,2) NOT NULL,
  species_id uuid REFERENCES public.tree_sequestration_rates(id),
  rate_used_kg_per_year numeric(8,2) NOT NULL,
  survival_rate_used numeric(5,4) NOT NULL,
  horizon_years_used integer NOT NULL,
  trees_needed integer NOT NULL,
  trees_planted_prior integer NOT NULL DEFAULT 0,
  trees_committed_prior integer NOT NULL DEFAULT 0,
  trees_chosen_this_session integer NOT NULL,
  slider_max_this_session integer NOT NULL,
  tree_credit_pct_after numeric(5,2) NOT NULL,
  tree_debt_pct_after numeric(5,2) NOT NULL,
  donation_usd_per_tree numeric(8,2) NOT NULL,
  total_contribution_usd numeric(10,2) NOT NULL,
  config_id uuid REFERENCES public.planting_cost_configs(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.carbon_offset_calculations ENABLE ROW LEVEL SECURITY;

-- RLS: Tourists can SELECT own rows
CREATE POLICY "Users can view own offset calculations"
  ON public.carbon_offset_calculations
  FOR SELECT
  TO authenticated
  USING (tourist_id = auth.uid());

-- RLS: Tourists can INSERT own rows
CREATE POLICY "Users can insert own offset calculations"
  ON public.carbon_offset_calculations
  FOR INSERT
  TO authenticated
  WITH CHECK (tourist_id = auth.uid());

-- RLS: Admins can SELECT all
CREATE POLICY "Admins can view all offset calculations"
  ON public.carbon_offset_calculations
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- COLUMN ADDITION to planting_cost_configs
ALTER TABLE public.planting_cost_configs
  ADD COLUMN default_species_id uuid REFERENCES public.tree_sequestration_rates(id);
