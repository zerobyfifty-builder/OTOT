-- Backfill existing contribution_tracking rows with wallet allocation values
DO $$
DECLARE
  tech_fee numeric;
  ktb_fee numeric;
  plantation_fee numeric;
BEGIN
  SELECT setting_value INTO tech_fee FROM public.wallet_settings WHERE setting_key = 'tech_partner_fee';
  SELECT setting_value INTO ktb_fee FROM public.wallet_settings WHERE setting_key = 'ktb_marketing_fee';
  SELECT setting_value INTO plantation_fee FROM public.wallet_settings WHERE setting_key = 'tree_plantation_fee';
  
  IF tech_fee IS NULL THEN tech_fee := 30; END IF;
  IF ktb_fee IS NULL THEN ktb_fee := 40; END IF;
  IF plantation_fee IS NULL THEN plantation_fee := 60; END IF;

  UPDATE public.contribution_tracking
  SET 
    amount_received = amount_paid - (amount_paid * tech_fee / 100),
    amount_retained = (amount_paid - (amount_paid * tech_fee / 100)) * ktb_fee / 100,
    amount_transferred = (amount_paid - (amount_paid * tech_fee / 100)) * plantation_fee / 100;
END $$;