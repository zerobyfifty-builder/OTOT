CREATE TABLE public.wallet_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value numeric NOT NULL DEFAULT 0,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.wallet_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage wallet settings"
  ON public.wallet_settings FOR ALL
  TO public
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Authenticated users can view wallet settings"
  ON public.wallet_settings FOR SELECT
  TO public
  USING (auth.uid() IS NOT NULL);

INSERT INTO public.wallet_settings (setting_key, setting_value, description) VALUES
  ('tech_partner_fee', 30, 'Tech Partner Platform Dev & Maintenance Fee (%)'),
  ('ktb_marketing_fee', 30, 'KTB Marketing Fee (% of remaining after tech fee)'),
  ('tree_plantation_fee', 70, 'Tree Plantation & Growing Fee (% of remaining after tech fee - auto calculated)');