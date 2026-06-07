ALTER TABLE public.organizations DROP CONSTRAINT organizations_category_check;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_category_check CHECK (category = ANY (ARRAY['government'::text, 'business'::text, 'ngo'::text, 'owner'::text]));
ALTER TABLE public.partner_types DROP CONSTRAINT partner_types_category_check;
ALTER TABLE public.partner_types ADD CONSTRAINT partner_types_category_check CHECK (category = ANY (ARRAY['government'::text, 'business'::text, 'ngo'::text, 'owner'::text]));