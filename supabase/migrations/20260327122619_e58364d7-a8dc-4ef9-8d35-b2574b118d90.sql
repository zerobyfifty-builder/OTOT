CREATE OR REPLACE FUNCTION public.auto_populate_receipt_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tech_fee_pct numeric;
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

  -- Auto-populate tech_fee_received (replicate tech fee allocated)
  IF NEW.tech_fee_received IS NULL OR NEW.tech_fee_received = 0 THEN
    SELECT COALESCE(setting_value, 30) INTO tech_fee_pct
    FROM public.wallet_settings WHERE setting_key = 'tech_partner_fee';
    IF tech_fee_pct IS NULL THEN tech_fee_pct := 30; END IF;
    NEW.tech_fee_received := NEW.amount_paid * tech_fee_pct / 100;
  END IF;

  RETURN NEW;
END;
$$;