-- Add friendly_trip_id column to trips table for user-friendly display
ALTER TABLE public.trips 
ADD COLUMN friendly_trip_id text;

-- Create a sequence for generating trip numbers
CREATE SEQUENCE IF NOT EXISTS trip_number_seq START WITH 1;

-- Create a function to generate friendly trip IDs
CREATE OR REPLACE FUNCTION generate_friendly_trip_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.friendly_trip_id IS NULL THEN
    NEW.friendly_trip_id := 'TRIP' || LPAD(nextval('trip_number_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate friendly trip IDs on insert
CREATE TRIGGER set_friendly_trip_id
  BEFORE INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION generate_friendly_trip_id();

-- Backfill existing trips with friendly IDs
DO $$
DECLARE
  trip_record RECORD;
  counter INTEGER := 1;
BEGIN
  FOR trip_record IN 
    SELECT id FROM public.trips 
    WHERE friendly_trip_id IS NULL 
    ORDER BY created_at
  LOOP
    UPDATE public.trips 
    SET friendly_trip_id = 'TRIP' || LPAD(counter::text, 3, '0')
    WHERE id = trip_record.id;
    counter := counter + 1;
  END LOOP;
  
  -- Update sequence to continue from the last number
  PERFORM setval('trip_number_seq', counter);
END $$;