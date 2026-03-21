-- Backfill existing organization_modules with default permissions
-- Scoped modules get full RWED, shared modules get read-only
UPDATE public.organization_modules om
SET permissions = '["read", "write", "edit", "delete"]'::jsonb
FROM public.modules m
WHERE om.module_id = m.id
  AND m.access_type = 'scoped'
  AND (om.permissions IS NULL OR om.permissions = '[]'::jsonb);

UPDATE public.organization_modules om
SET permissions = '["read"]'::jsonb
FROM public.modules m
WHERE om.module_id = m.id
  AND m.access_type = 'shared'
  AND (om.permissions IS NULL OR om.permissions = '[]'::jsonb);