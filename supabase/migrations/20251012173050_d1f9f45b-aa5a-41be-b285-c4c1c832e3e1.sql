-- Create function to check if user is institutional partner
CREATE OR REPLACE FUNCTION public.is_institutional_partner(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.user_id = user_id
    AND r.name = 'institutional_partner'
  );
$$;

-- Add RLS policies for institutional partners to view all data

-- Trees table
CREATE POLICY "Institutional partners can view all trees"
ON public.trees
FOR SELECT
USING (is_institutional_partner(auth.uid()));

-- Trips table  
CREATE POLICY "Institutional partners can view all trips"
ON public.trips
FOR SELECT
USING (is_institutional_partner(auth.uid()));

-- Users table
CREATE POLICY "Institutional partners can view all users"
ON public.users
FOR SELECT
USING (is_institutional_partner(auth.uid()));