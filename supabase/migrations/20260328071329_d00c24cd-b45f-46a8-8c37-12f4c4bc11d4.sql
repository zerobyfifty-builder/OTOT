-- Add mktng_fee_allocated column to contribution_tracking
ALTER TABLE public.contribution_tracking
ADD COLUMN mktng_fee_allocated numeric DEFAULT 0;

-- Update the auto_populate_receipt_fields function to also populate mktng_fee_allocated
CREATE OR REPLACE FUNCTION public.auto_populate_receipt_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tech_fee_pct numeric;
  ktb_fee_pct numeric;
  remaining numeric;
BEGIN
  -- Auto-populate institution receipt fields
  IF NEW.institution_receipt_id IS NULL THEN
    NEW.institution_receipt_id := NEW.transaction_reference;
  END IF;
  IF NEW.institution_received_date IS NULL THEN
    NEW.institution_received_date := COALESCE(NEW.payment_date::date, NEW.created_at::date, now()::date);
  END IF;

  -- Auto-populate tech receipt fields
  IF NEW.tech_receipt_id IS NULL THEN
    NEW.tech_receipt_id := NEW.transaction_reference;
  END IF;
  IF NEW.tech_received_date IS NULL THEN
    NEW.tech_received_date := COALESCE(NEW.payment_date::date, NEW.created_at::date, now()::date);
  END IF;

  -- Auto-populate tech_fee_received
  IF NEW.tech_fee_received IS NULL OR NEW.tech_fee_received = 0 THEN
    SELECT COALESCE(setting_value, 30) INTO tech_fee_pct
    FROM public.wallet_settings WHERE setting_key = 'tech_partner_fee';
    IF tech_fee_pct IS NULL THEN tech_fee_pct := 30; END IF;
    NEW.tech_fee_received := NEW.amount_paid * tech_fee_pct / 100;
  END IF;

  -- Auto-populate mktng_fee_allocated (KTB marketing fee from wallet settings)
  IF NEW.mktng_fee_allocated IS NULL OR NEW.mktng_fee_allocated = 0 THEN
    SELECT COALESCE(setting_value, 40) INTO ktb_fee_pct
    FROM public.wallet_settings WHERE setting_key = 'ktb_marketing_fee';
    IF ktb_fee_pct IS NULL THEN ktb_fee_pct := 40; END IF;
    remaining := COALESCE(NEW.amount_received, 0);
    NEW.mktng_fee_allocated := remaining * ktb_fee_pct / 100;
  END IF;

  RETURN NEW;
END;
$function$;