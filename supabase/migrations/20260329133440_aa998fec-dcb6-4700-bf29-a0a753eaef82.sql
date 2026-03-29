
-- Add missing columns to seed_species table
ALTER TABLE public.seed_species
  ADD COLUMN IF NOT EXISTS common_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS scientific_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS growing_zone VARCHAR(200),
  ADD COLUMN IF NOT EXISTS avg_height_mature_m DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS co2_sequestration_kg_year DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill common_name from species_name for existing records
UPDATE public.seed_species SET common_name = species_name WHERE common_name IS NULL;

-- Add availability_status and notes to nursery_species junction table
ALTER TABLE public.nursery_species
  ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'Available',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add updated_at trigger for seed_species
CREATE OR REPLACE TRIGGER seed_species_updated_at
  BEFORE UPDATE ON public.seed_species
  FOR EACH ROW
  EXECUTE FUNCTION public.mdm_update_timestamp();

-- Add RLS policy for stakeholders to manage seed_species
CREATE POLICY "sh_seed_species_manage"
  ON public.seed_species
  FOR ALL
  TO authenticated
  USING (stakeholder_has_module(auth.uid(), 'mdm_species'))
  WITH CHECK (stakeholder_has_module(auth.uid(), 'mdm_species'));
