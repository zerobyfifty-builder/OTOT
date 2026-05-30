
-- 1. Extend trips with source columns + agent-context fields
ALTER TABLE public.trips
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'tourist',
  ADD COLUMN IF NOT EXISTS source_ref_table text,
  ADD COLUMN IF NOT EXISTS source_ref_id uuid,
  ADD COLUMN IF NOT EXISTS agent_id uuid,
  ADD COLUMN IF NOT EXISTS staff_name text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS ticket_number text,
  ADD COLUMN IF NOT EXISTS pnr_number text,
  ADD COLUMN IF NOT EXISTS lpo_number text;

ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_source_type_check;
ALTER TABLE public.trips
  ADD CONSTRAINT trips_source_type_check
  CHECK (source_type IN ('tourist','travel_agent','b2b','airline'));

CREATE INDEX IF NOT EXISTS idx_trips_source_type ON public.trips(source_type);
CREATE UNIQUE INDEX IF NOT EXISTS uq_trips_source_ref
  ON public.trips(source_ref_table, source_ref_id)
  WHERE source_ref_table IS NOT NULL AND source_ref_id IS NOT NULL;

-- 2. Sync function: mirror agent_tickets -> trips
CREATE OR REPLACE FUNCTION public.sync_agent_ticket_to_trip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _trip_id uuid;
  _travel_class travel_class_type;
  _accommodation_type accommodation_type;
BEGIN
  -- Map travel_class text to enum (default Economy)
  BEGIN
    _travel_class := COALESCE(NEW.travel_class, 'Economy')::travel_class_type;
  EXCEPTION WHEN others THEN
    _travel_class := 'Economy'::travel_class_type;
  END;

  BEGIN
    _accommodation_type := NULLIF(NEW.accommodation_type,'')::accommodation_type;
  EXCEPTION WHEN others THEN
    _accommodation_type := NULL;
  END;

  SELECT id INTO _trip_id FROM public.trips
   WHERE source_ref_table='agent_tickets' AND source_ref_id=NEW.id;

  IF _trip_id IS NULL THEN
    INSERT INTO public.trips (
      user_id, origin_airport, destination_airport, travel_class, is_return,
      from_date, to_date, accommodation_type, num_travelers,
      flight_co2, accommodation_co2, total_co2, trees_needed,
      entry_source, source_type, source_ref_table, source_ref_id,
      agent_id, staff_name, department, ticket_number, pnr_number, lpo_number,
      created_at, updated_at
    ) VALUES (
      NULL, NEW.origin_airport, NEW.destination_airport, _travel_class, NEW.is_return,
      NEW.from_date, NEW.to_date, _accommodation_type, NEW.num_travelers,
      NEW.flight_co2, NEW.accommodation_co2, NEW.total_co2, NEW.trees_needed,
      'Manual'::entry_source_type, 'travel_agent', 'agent_tickets', NEW.id,
      NEW.agent_id, NEW.staff_name, NEW.department, NEW.ticket_number, NEW.pnr_number, NEW.lpo_number,
      NEW.created_at, NEW.updated_at
    );
  ELSE
    UPDATE public.trips SET
      origin_airport=NEW.origin_airport, destination_airport=NEW.destination_airport,
      travel_class=_travel_class, is_return=NEW.is_return,
      from_date=NEW.from_date, to_date=NEW.to_date, accommodation_type=_accommodation_type,
      num_travelers=NEW.num_travelers, flight_co2=NEW.flight_co2,
      accommodation_co2=NEW.accommodation_co2, total_co2=NEW.total_co2,
      trees_needed=NEW.trees_needed, agent_id=NEW.agent_id, staff_name=NEW.staff_name,
      department=NEW.department, ticket_number=NEW.ticket_number,
      pnr_number=NEW.pnr_number, lpo_number=NEW.lpo_number, updated_at=NEW.updated_at
    WHERE id=_trip_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_agent_ticket_to_trip ON public.agent_tickets;
CREATE TRIGGER trg_sync_agent_ticket_to_trip
AFTER INSERT OR UPDATE ON public.agent_tickets
FOR EACH ROW EXECUTE FUNCTION public.sync_agent_ticket_to_trip();

-- 3. Backfill existing agent_tickets
INSERT INTO public.trips (
  user_id, origin_airport, destination_airport, travel_class, is_return,
  from_date, to_date, accommodation_type, num_travelers,
  flight_co2, accommodation_co2, total_co2, trees_needed,
  entry_source, source_type, source_ref_table, source_ref_id,
  agent_id, staff_name, department, ticket_number, pnr_number, lpo_number,
  created_at, updated_at
)
SELECT
  NULL, at.origin_airport, at.destination_airport,
  COALESCE(NULLIF(at.travel_class,'')::travel_class_type, 'Economy'::travel_class_type),
  at.is_return, at.from_date, at.to_date,
  NULLIF(at.accommodation_type,'')::accommodation_type,
  at.num_travelers, at.flight_co2, at.accommodation_co2, at.total_co2, at.trees_needed,
  'Manual'::entry_source_type, 'travel_agent', 'agent_tickets', at.id,
  at.agent_id, at.staff_name, at.department, at.ticket_number, at.pnr_number, at.lpo_number,
  at.created_at, at.updated_at
FROM public.agent_tickets at
WHERE NOT EXISTS (
  SELECT 1 FROM public.trips t
  WHERE t.source_ref_table='agent_tickets' AND t.source_ref_id=at.id
);

-- 4. Link contribution_tracking rows for agent contributions to their mirrored trip
UPDATE public.contribution_tracking ct
SET trip_id = t.id
FROM public.trips t
WHERE ct.contribution_type='travel_agent'
  AND ct.trip_id IS NULL
  AND t.source_ref_table='agent_tickets'
  AND t.source_ref_id = ct.source_id;
