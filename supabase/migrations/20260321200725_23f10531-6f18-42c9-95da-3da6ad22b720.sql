-- Add wallet allocation columns to contribution_tracking
ALTER TABLE public.contribution_tracking 
  ADD COLUMN IF NOT EXISTS amount_received numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_retained numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_transferred numeric DEFAULT 0;

-- Create trigger to auto-calculate on insert/update
CREATE OR REPLACE FUNCTION public.calculate_wallet_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
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
  
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_calculate_wallet_allocation ON public.contribution_tracking;
CREATE TRIGGER trg_calculate_wallet_allocation
  BEFORE INSERT OR UPDATE OF amount_paid ON public.contribution_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_wallet_allocation();