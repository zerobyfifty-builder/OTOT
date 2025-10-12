-- Drop the problematic RLS policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view organization users" ON public.users;

-- Recreate it using the security definer function to avoid recursion
CREATE POLICY "Users can view organization users"
ON public.users
FOR SELECT
USING (
  auth.uid() = user_id 
  OR users_in_same_org(auth.uid(), user_id)
);