
-- Add fee snapshot columns to contribution_tracking
ALTER TABLE public.contribution_tracking
  ADD COLUMN IF NOT EXISTS tech_fee_percent numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ktb_fee_percent numeric DEFAULT NULL;

-- Update the calculate_wallet_allocation trigger to also store the fee percentages
CREATE OR REPLACE FUNCTION public.calculate_wallet_allocation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tech_fee numeric;
  ktb_fee numeric;
  plantation_fee numeric;
  remaining numeric;
BEGIN
  SELECT setting_value INTO tech_fee FROM public.wallet_settings WHERE setting_key = 'tech_partner_fee';
  SELECT setting_value INTO ktb_fee FROM public.wallet_settings WHERE setting_key = 'ktb_marketing_fee';
  SELECT setting_value INTO plantation_fee FROM public.wallet_settings WHERE setting_key = 'tree_plantation_fee';
  
  IF tech_fee IS NULL THEN tech_fee := 30; END IF;
  IF ktb_fee IS NULL THEN ktb_fee := 40; END IF;
  IF plantation_fee IS NULL THEN plantation_fee := 60; END IF;

  remaining := NEW.amount_paid - (NEW.amount_paid * tech_fee / 100);
  NEW.amount_received := remaining;
  NEW.amount_retained := remaining * ktb_fee / 100;
  NEW.amount_transferred := remaining * plantation_fee / 100;
  
  -- Snapshot the fee percentages at creation time
  NEW.tech_fee_percent := tech_fee;
  NEW.ktb_fee_percent := ktb_fee;
  
  RETURN NEW;
END;
$function$;

-- Backfill existing records that don't have fee percentages stored
UPDATE public.contribution_tracking
SET tech_fee_percent = (SELECT COALESCE(setting_value, 30) FROM public.wallet_settings WHERE setting_key = 'tech_partner_fee'),
    ktb_fee_percent = (SELECT COALESCE(setting_value, 40) FROM public.wallet_settings WHERE setting_key = 'ktb_marketing_fee')
WHERE tech_fee_percent IS NULL OR ktb_fee_percent IS NULL;
