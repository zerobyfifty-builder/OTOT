-- Insert Payment Management module
INSERT INTO public.modules (name, display_name, category, route, is_active, access_type, description, sort_order)
VALUES ('payment_management', 'Payment Management', 'financial', '/payments', true, 'shared', 'View and manage financial transactions', 70)
ON CONFLICT (name) DO NOTHING;

-- Add RLS policy for partner_transactions for stakeholders with payment_management module
CREATE POLICY "Stakeholders with payment_management can view transactions"
  ON public.partner_transactions FOR SELECT
  TO authenticated
  USING (
    stakeholder_has_module_permission(auth.uid(), 'payment_management', 'read')
  );