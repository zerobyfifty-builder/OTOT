-- Function to check if a stakeholder has a specific module assigned
CREATE OR REPLACE FUNCTION public.stakeholder_has_module(_user_id uuid, _module_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.organization_modules om ON om.organization_id = u.organization_id
    JOIN public.modules m ON m.id = om.module_id
    WHERE u.user_id = _user_id
      AND m.name = _module_name
      AND om.is_active = true
      AND m.is_active = true
  )
$$;

-- Add policy: stakeholders with tree_orders module can view ALL trees
CREATE POLICY "Stakeholders with tree_orders module can view all trees"
ON public.trees
FOR SELECT
TO authenticated
USING (
  is_stakeholder(auth.uid()) AND stakeholder_has_module(auth.uid(), 'tree_orders')
);

-- Add policy: stakeholders with tree_orders module can update ALL trees
CREATE POLICY "Stakeholders with tree_orders module can update all trees"
ON public.trees
FOR UPDATE
TO authenticated
USING (
  is_stakeholder(auth.uid()) AND stakeholder_has_module(auth.uid(), 'tree_orders')
);