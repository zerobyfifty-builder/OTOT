-- Fix security issue: Set search_path for the generate_friendly_trip_id function
CREATE OR REPLACE FUNCTION generate_friendly_trip_id()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.friendly_trip_id IS NULL THEN
    NEW.friendly_trip_id := 'TRIP' || LPAD(nextval('trip_number_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;