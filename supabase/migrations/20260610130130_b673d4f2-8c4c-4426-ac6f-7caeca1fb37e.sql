
-- Enums
DO $$ BEGIN
  CREATE TYPE public.contribution_tier_type AS ENUM ('fixed','custom_range','subscription','recurring');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.contribution_tier_portal AS ENUM ('tourist','b2b');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Catalog
CREATE TABLE IF NOT EXISTS public.contribution_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  tier_type public.contribution_tier_type NOT NULL DEFAULT 'fixed',
  trees_count integer,
  min_trees integer,
  max_trees integer,
  duration_months integer,
  recurring_interval text,
  badge text,
  sort_order integer NOT NULL DEFAULT 0,
  price_override_usd numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contribution_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contribution_tiers TO authenticated;
GRANT ALL ON public.contribution_tiers TO service_role;

ALTER TABLE public.contribution_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tiers" ON public.contribution_tiers
  FOR SELECT USING (true);
CREATE POLICY "Super admin manage tiers - insert" ON public.contribution_tiers
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin manage tiers - update" ON public.contribution_tiers
  FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin manage tiers - delete" ON public.contribution_tiers
  FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_contribution_tiers_updated_at
  BEFORE UPDATE ON public.contribution_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Visibility per portal
CREATE TABLE IF NOT EXISTS public.contribution_tier_visibility (
  tier_id uuid NOT NULL REFERENCES public.contribution_tiers(id) ON DELETE CASCADE,
  portal public.contribution_tier_portal NOT NULL,
  is_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tier_id, portal)
);

GRANT SELECT ON public.contribution_tier_visibility TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contribution_tier_visibility TO authenticated;
GRANT ALL ON public.contribution_tier_visibility TO service_role;

ALTER TABLE public.contribution_tier_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read visibility" ON public.contribution_tier_visibility
  FOR SELECT USING (true);
CREATE POLICY "Super admin manage visibility - insert" ON public.contribution_tier_visibility
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin manage visibility - update" ON public.contribution_tier_visibility
  FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin manage visibility - delete" ON public.contribution_tier_visibility
  FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_contribution_tier_visibility_updated_at
  BEFORE UPDATE ON public.contribution_tier_visibility
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 8 preset tiers (visibility defaults off so existing Tourist UI is byte-identical)
INSERT INTO public.contribution_tiers (key, name, description, tier_type, trees_count, badge, sort_order)
VALUES
  ('seedling',  'Seedling only',         'Sponsor a seedling at the nursery',          'fixed', 1,    'fixed',        10),
  ('plant',     'Plant a tree',          'Full planting cost covered',                  'fixed', 1,    'recommended',  20),
  ('adopt',     'Adopt a tree (3 yr)',   'Planting + 3 years of aftercare',             'fixed', 1,    NULL,           30),
  ('monthly',   'Monthly fund',          'Recurring monthly contribution',              'recurring', 1, NULL,          40),
  ('yearly',    'Yearly fund',           'Annual contribution',                         'recurring', 1, NULL,          50),
  ('recommit',  'Re-contribute (yr 4+)', 'Continued care after initial period',         'fixed', 1,    NULL,           60),
  ('grove',     'Grove (100 trees)',     'Sponsor a grove of 100 trees',                'fixed', 100,  NULL,           70),
  ('forest',    'Forest (1,000 trees)',  'Sponsor a mini-forest',                       'fixed', 1000, NULL,           80)
ON CONFLICT (key) DO NOTHING;

UPDATE public.contribution_tiers SET recurring_interval='monthly' WHERE key='monthly';
UPDATE public.contribution_tiers SET recurring_interval='yearly'  WHERE key='yearly';

INSERT INTO public.contribution_tier_visibility (tier_id, portal, is_visible)
SELECT t.id, p.portal, false
FROM public.contribution_tiers t
CROSS JOIN (VALUES ('tourist'::public.contribution_tier_portal), ('b2b'::public.contribution_tier_portal)) AS p(portal)
ON CONFLICT DO NOTHING;
