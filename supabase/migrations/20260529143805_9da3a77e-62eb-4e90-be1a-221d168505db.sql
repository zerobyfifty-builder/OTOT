
-- Merge duplicate lowercase 'lodge' into 'Lodge'
UPDATE public.organizations SET partner_type_id = 'dc6aa5f1-1a60-4ab0-9d01-b7782df94b5f'
WHERE partner_type_id = '37da152a-1daa-4bdb-9d44-88638535648b';
DELETE FROM public.partner_types WHERE id = '37da152a-1daa-4bdb-9d44-88638535648b';

-- Remove unused duplicate lowercase 'ministry' (inactive, no refs)
DELETE FROM public.partner_types WHERE id = 'cf22446f-c1fb-4f7a-a0a2-bacb6a53c249';

-- Canonical capitalization for business sub-categories
UPDATE public.partner_types SET name = 'Airline' WHERE id = '689d7463-b22e-4d03-88d7-df4cc5b09034';
UPDATE public.partner_types SET name = 'Community' WHERE id = '4ef45c0f-f70f-45e0-a89d-49fb208b9154';
UPDATE public.partner_types SET name = 'Nursery' WHERE id = '7f821c50-8e96-4050-b41c-39897a413007';
UPDATE public.partner_types SET name = 'Plantation' WHERE id = 'a9809154-315f-4917-b979-328b02611335';
