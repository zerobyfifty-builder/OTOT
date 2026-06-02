CREATE POLICY admins_delete_submissions ON public.planting_cost_submissions FOR DELETE USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS admins_delete_notifications ON public.planting_cost_notifications;
CREATE POLICY admins_delete_notifications ON public.planting_cost_notifications FOR DELETE USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));