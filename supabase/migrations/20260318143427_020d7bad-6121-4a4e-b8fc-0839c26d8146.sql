-- Add new columns to nurseries table
ALTER TABLE public.nurseries
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS sub_county text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS manager_name text,
  ADD COLUMN IF NOT EXISTS manager_phone text,
  ADD COLUMN IF NOT EXISTS is_kefri_certified boolean DEFAULT false;

-- Create nursery_species junction table
CREATE TABLE IF NOT EXISTS public.nursery_species (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nursery_id uuid NOT NULL REFERENCES public.nurseries(id) ON DELETE CASCADE,
  species_id uuid NOT NULL REFERENCES public.seed_species(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(nursery_id, species_id)
);

ALTER TABLE public.nursery_species ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_nursery_species" ON public.nursery_species
  FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "sh_nursery_species" ON public.nursery_species
  FOR ALL 
  USING (is_stakeholder(auth.uid()) AND nursery_id IN (
    SELECT id FROM public.nurseries WHERE stakeholder_org_id = get_user_organization(auth.uid())
  ))
  WITH CHECK (is_stakeholder(auth.uid()) AND nursery_id IN (
    SELECT id FROM public.nurseries WHERE stakeholder_org_id = get_user_organization(auth.uid())
  ));