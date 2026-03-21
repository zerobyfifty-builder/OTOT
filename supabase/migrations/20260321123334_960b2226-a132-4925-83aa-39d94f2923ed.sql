-- Add access_type column to modules table
ALTER TABLE public.modules ADD COLUMN access_type TEXT NOT NULL DEFAULT 'shared';

-- Set existing modules access types
UPDATE public.modules SET access_type = 'scoped' WHERE name = 'travel_agents';
UPDATE public.modules SET access_type = 'shared' WHERE name = 'tree_orders';

-- Create permission-aware module check function
CREATE OR REPLACE FUNCTION public.stakeholder_has_module_permission(
  _user_id uuid, _module_name text, _permission text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.organization_modules om ON om.organization_id = u.organization_id
    JOIN public.modules m ON m.id = om.module_id
    WHERE u.user_id = _user_id
      AND m.name = _module_name
      AND om.is_active = true
      AND m.is_active = true
      AND om.permissions @> to_jsonb(_permission)
  )
$$;