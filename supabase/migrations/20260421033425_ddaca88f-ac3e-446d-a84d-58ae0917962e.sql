-- Backfill stakeholder role + organization for org_users that already have an auth user
UPDATE public.users u
SET role_id = (SELECT id FROM public.roles WHERE name = 'stakeholder'),
    organization_id = ou.organization_id
FROM public.org_users ou
WHERE ou.user_id = u.user_id
  AND ou.status = 'active'
  AND (u.role_id IS NULL OR u.organization_id IS NULL);