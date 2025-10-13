-- Add RLS policy for lodges to view their assigned trees
-- First, we need to handle lodge authentication properly
-- Since lodges use a separate auth system, we'll allow access based on organization_id

-- Add policy for business partners (lodges) to view trees assigned to their organization
CREATE POLICY "Business partners can view trees assigned to their lodge"
ON public.trees
FOR SELECT
TO authenticated
USING (
  lodge_id IN (
    SELECT id 
    FROM public.lodges 
    WHERE id IN (
      SELECT id::uuid 
      FROM public.organizations 
      WHERE id = (
        SELECT organization_id 
        FROM public.users 
        WHERE user_id = auth.uid()
      )
    )
  )
);

-- Allow business partners to update trees assigned to their lodge
CREATE POLICY "Business partners can update their assigned trees"
ON public.trees
FOR UPDATE
TO authenticated
USING (
  lodge_id IN (
    SELECT id 
    FROM public.lodges 
    WHERE id IN (
      SELECT id::uuid 
      FROM public.organizations 
      WHERE id = (
        SELECT organization_id 
        FROM public.users 
        WHERE user_id = auth.uid()
      )
    )
  )
);

-- Update notifications table to allow lodges to see their notifications
CREATE POLICY "Lodges can view their notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  (recipient_type = 'lodge' AND recipient_id = (
    SELECT organization_id 
    FROM public.users 
    WHERE user_id = auth.uid()
  ))
);