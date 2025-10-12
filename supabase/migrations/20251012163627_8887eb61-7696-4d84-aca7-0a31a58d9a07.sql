-- Fix infinite recursion in trees RLS policies by using a security definer function
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view organization trees" ON public.trees;

-- Create a helper function to check if users are in the same organization
CREATE OR REPLACE FUNCTION public.users_in_same_org(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u1
    INNER JOIN public.users u2 ON u1.organization_id = u2.organization_id
    WHERE u1.user_id = user1_id
      AND u2.user_id = user2_id
      AND u1.organization_id IS NOT NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.users_in_same_org(uuid, uuid) TO authenticated;

-- Recreate the policy using the security definer function
CREATE POLICY "Users can view organization trees"
ON public.trees
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.users_in_same_org(auth.uid(), user_id)
);

-- Fix trips table policies similarly
DROP POLICY IF EXISTS "Users can view organization trips" ON public.trips;

CREATE POLICY "Users can view organization trips"
ON public.trips
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.users_in_same_org(auth.uid(), user_id)
);
