-- Allow org admins and super admins to delete activity logs for their organization
CREATE POLICY "Org admins can delete their organization activity logs"
ON public.activity_logs
FOR DELETE
TO authenticated
USING (
  organization_id IS NOT NULL
  AND (
    is_super_admin(auth.uid())
    OR is_org_admin(auth.uid(), organization_id)
  )
);