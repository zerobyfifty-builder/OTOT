CREATE OR REPLACE FUNCTION public.auto_populate_receipt_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_populate_receipt_fields
BEFORE INSERT ON public.contribution_tracking
FOR EACH ROW
EXECUTE FUNCTION public.auto_populate_receipt_fields();