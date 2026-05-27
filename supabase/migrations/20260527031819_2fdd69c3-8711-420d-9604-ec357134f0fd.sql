
-- Relax both CHECK constraints first
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_category_check;
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_category_check
  CHECK (category = ANY (ARRAY['institutional'::text, 'government'::text, 'business'::text, 'owner'::text]));

ALTER TABLE public.partner_types DROP CONSTRAINT IF EXISTS partner_types_category_check;
ALTER TABLE public.partner_types
  ADD CONSTRAINT partner_types_category_check
  CHECK (category = ANY (ARRAY['institutional'::text, 'government'::text, 'business'::text, 'owner'::text]));

-- Rename role
UPDATE public.roles SET name = 'government_partner' WHERE name = 'institutional_partner';

-- Migrate category values
UPDATE public.organizations SET category = 'government' WHERE category = 'institutional';
UPDATE public.partner_types SET category = 'government' WHERE category = 'institutional';

-- Tighten constraints to drop legacy value
ALTER TABLE public.organizations DROP CONSTRAINT organizations_category_check;
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_category_check
  CHECK (category = ANY (ARRAY['government'::text, 'business'::text, 'owner'::text]));

ALTER TABLE public.partner_types DROP CONSTRAINT partner_types_category_check;
ALTER TABLE public.partner_types
  ADD CONSTRAINT partner_types_category_check
  CHECK (category = ANY (ARRAY['government'::text, 'business'::text, 'owner'::text]));

-- Update helper function (keeps existing RLS policies working)
CREATE OR REPLACE FUNCTION public.is_institutional_partner(user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.user_id = user_id AND r.name = 'government_partner'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_government_partner(user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.user_id = user_id AND r.name = 'government_partner'
  )
$$;

-- Deactivate legacy government partner_types
UPDATE public.partner_types
SET is_active = false
WHERE category = 'government'
  AND name IN ('ktb', 'Tourism Board', 'ministry');

-- Seed approved government partner type catalog
INSERT INTO public.partner_types (name, category, is_active)
SELECT v.name, 'government', true
FROM (VALUES
  ('Ministry'),
  ('State Department'),
  ('State Corporation/Parastatal'),
  ('Independent Commission/Office'),
  ('County Executive Department'),
  ('Other')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.partner_types pt
  WHERE pt.category = 'government' AND pt.name = v.name
);
