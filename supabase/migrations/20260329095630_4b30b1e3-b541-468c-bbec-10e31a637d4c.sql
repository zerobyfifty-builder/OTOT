-- Update the trip ID generation to be more robust for millions of records
-- Format: TRIP-0000001 (7-digit zero-padded)
CREATE OR REPLACE FUNCTION public.generate_friendly_trip_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.friendly_trip_id IS NULL THEN
    NEW.friendly_trip_id := 'TRIP-' || LPAD(nextval('trip_number_seq')::text, 7, '0');
  END IF;
  RETURN NEW;
END;
$function$;