ALTER TABLE public.modules DROP CONSTRAINT IF EXISTS modules_category_check;
ALTER TABLE public.modules ADD CONSTRAINT modules_category_check CHECK (category IN ('financial','master_data','operations','oversight','reporting','configuration'));

INSERT INTO public.modules (name, display_name, description, category, icon, route, is_active, sort_order, access_type, audience) VALUES
  ('wallet_settings', 'Wallet Settings', 'Fee distribution and wallet routing configuration', 'configuration', 'Wallet', '/admin/config/wallet', true, 80, 'shared', 'owner'),
  ('planting_costs', 'Planting Costs', 'Per-tree planting cost setup and submissions', 'configuration', 'Coins', '/admin/config/planting-costs', true, 81, 'shared', 'owner'),
  ('contribution_tiers', 'Contribution Tiers', 'Tier-based contribution pricing', 'configuration', 'Layers', '/admin/config/contribution-tiers', true, 82, 'shared', 'owner')
ON CONFLICT (name) DO NOTHING;