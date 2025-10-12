-- Drop and recreate the get_user_role function to fix any caching issues
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

CREATE OR REPLACE FUNCTION public.get_user_role(input_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_name text;
BEGIN
  SELECT r.name INTO user_role_name
  FROM public.users u
  INNER JOIN public.roles r ON u.role_id = r.id
  WHERE u.user_id = input_user_id
  LIMIT 1;
  
  RETURN user_role_name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon;

COMMENT ON FUNCTION public.get_user_role(uuid) IS 'Returns the role name for a user, bypassing RLS to avoid recursion';
