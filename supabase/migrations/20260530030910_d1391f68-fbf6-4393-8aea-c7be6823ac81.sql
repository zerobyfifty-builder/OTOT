-- 1. Add column
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS organization_id uuid;

-- 2. Index for filtering
CREATE INDEX IF NOT EXISTS idx_trips_organization_id ON public.trips(organization_id);

-- 3. Backfill from users.organization_id where applicable
UPDATE public.trips t
SET organization_id = u.organization_id
FROM public.users u
WHERE t.user_id = u.user_id
  AND u.organization_id IS NOT NULL
  AND t.organization_id IS NULL;

-- 4. Trigger to auto-stamp organization_id at insert based on the creating user
CREATE OR REPLACE FUNCTION public.stamp_trip_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.users
    WHERE user_id = NEW.user_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trips_stamp_organization_id ON public.trips;
CREATE TRIGGER trg_trips_stamp_organization_id
  BEFORE INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_trip_organization_id();

-- 5. Replace permissive institutional partner policy with org-scoped one
DROP POLICY IF EXISTS "Institutional partners can view all trips" ON public.trips;

CREATE POLICY "Institutional partners can view own org trips"
  ON public.trips
  FOR SELECT
  TO authenticated
  USING (
    is_institutional_partner(auth.uid())
    AND organization_id IS NOT NULL
    AND organization_id = get_user_organization(auth.uid())
  );