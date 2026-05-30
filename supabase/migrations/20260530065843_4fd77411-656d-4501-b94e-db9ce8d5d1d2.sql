
-- Phase 3: Tourist purchases as a real domain table

CREATE TABLE public.tourist_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trip_id uuid,
  num_trees integer NOT NULL CHECK (num_trees > 0),
  total_cost_usd numeric NOT NULL DEFAULT 0,
  price_per_tree_usd numeric,
  purchase_type text NOT NULL DEFAULT 'One-time',
  payment_method text,
  payment_reference text,
  location_name text NOT NULL DEFAULT 'Kenya Forest Service (KFS)',
  dedication_name text,
  dedication_email text,
  dedication_message text,
  is_dedicated boolean NOT NULL DEFAULT false,
  contribution_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tourist_purchases_user ON public.tourist_purchases(user_id);
CREATE INDEX idx_tourist_purchases_trip ON public.tourist_purchases(trip_id);
CREATE INDEX idx_tourist_purchases_contribution ON public.tourist_purchases(contribution_id);

GRANT SELECT, INSERT ON public.tourist_purchases TO authenticated;
GRANT ALL ON public.tourist_purchases TO service_role;

ALTER TABLE public.tourist_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY tourist_insert_own_purchase
  ON public.tourist_purchases FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY tourist_read_own_purchase
  ON public.tourist_purchases FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY admin_owner_read_purchases
  ON public.tourist_purchases FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_owner(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY sa_purchases
  ON public.tourist_purchases FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Sync function: domain row -> ledger + trees
CREATE OR REPLACE FUNCTION public.sync_tourist_purchase_to_contribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contribution_id text;
  v_ledger_id uuid;
  v_user_email text;
  v_partner_id uuid;
  v_price numeric;
  i integer;
BEGIN
  IF NEW.contribution_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT email INTO v_user_email
  FROM public.users
  WHERE user_id = NEW.user_id
  LIMIT 1;

  SELECT id INTO v_partner_id
  FROM public.organizations
  WHERE category = 'owner' AND COALESCE(status, 'active') = 'active'
  ORDER BY created_at ASC
  LIMIT 1;

  v_price := COALESCE(NEW.price_per_tree_usd, NEW.total_cost_usd / NULLIF(NEW.num_trees, 0), 0);

  INSERT INTO public.contribution_tracking (
    trip_id, tourist_name, num_trees, amount_paid, currency,
    payment_date, payment_method, transaction_reference,
    plantation_partner_id, status, contribution_type,
    source_table, source_id
  ) VALUES (
    NEW.trip_id,
    COALESCE(v_user_email, 'Unknown'),
    NEW.num_trees,
    NEW.total_cost_usd,
    'USD',
    NEW.created_at,
    NEW.payment_method,
    NEW.payment_reference,
    v_partner_id,
    'contribution_confirmed',
    'tourist',
    'tourist_purchases',
    NEW.id
  )
  RETURNING id, contribution_id INTO v_ledger_id, v_contribution_id;

  FOR i IN 1..NEW.num_trees LOOP
    INSERT INTO public.trees (
      user_id, otot_id, num_trees, purchase_type, amount_paid,
      status, lodge_id, location_name, trip_id, payment_method,
      contribution_id, owner_org_id
    ) VALUES (
      NEW.user_id,
      'TREE-' || to_char(extract(epoch from now())*1000, 'FM9999999999999') || '-' || substr(md5(random()::text || i::text), 1, 7),
      1,
      NEW.purchase_type,
      v_price,
      'Waiting to be Assigned',
      NULL,
      NEW.location_name,
      NEW.trip_id,
      NEW.payment_method,
      v_contribution_id,
      v_partner_id
    );
  END LOOP;

  UPDATE public.tourist_purchases
  SET contribution_id = v_contribution_id, updated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tourist_purchase_to_contribution
AFTER INSERT ON public.tourist_purchases
FOR EACH ROW EXECUTE FUNCTION public.sync_tourist_purchase_to_contribution();

-- One-shot backfill: synthesize tourist_purchases rows from existing ledger rows
DO $$
DECLARE
  r record;
  v_user_id uuid;
BEGIN
  FOR r IN
    SELECT ct.contribution_id, ct.trip_id, ct.num_trees, ct.amount_paid,
           ct.payment_method, ct.transaction_reference, ct.payment_date,
           ct.created_at, ct.updated_at
    FROM public.contribution_tracking ct
    WHERE (ct.contribution_type IS NULL OR ct.contribution_type = 'tourist')
      AND ct.contribution_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.tourist_purchases tp
        WHERE tp.contribution_id = ct.contribution_id
      )
  LOOP
    SELECT user_id INTO v_user_id
    FROM public.trees
    WHERE contribution_id = r.contribution_id AND user_id IS NOT NULL
    LIMIT 1;

    IF v_user_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.tourist_purchases (
      user_id, trip_id, num_trees, total_cost_usd,
      payment_method, payment_reference, contribution_id,
      created_at, updated_at
    ) VALUES (
      v_user_id, r.trip_id, GREATEST(COALESCE(r.num_trees, 1), 1),
      COALESCE(r.amount_paid, 0),
      r.payment_method, r.transaction_reference, r.contribution_id,
      COALESCE(r.payment_date, r.created_at, now()),
      COALESCE(r.updated_at, now())
    );
  END LOOP;
END $$;

-- Back-link existing ledger rows to their freshly created domain rows
UPDATE public.contribution_tracking ct
SET source_table = 'tourist_purchases', source_id = tp.id
FROM public.tourist_purchases tp
WHERE ct.contribution_id = tp.contribution_id
  AND ct.source_table IS NULL;

-- Reuse Phase 2 drift view scope (informational; existing view only covers agent_tickets)
COMMENT ON TABLE public.tourist_purchases IS 'Phase 3 domain table for tourist tree purchases. Source-of-truth for tourist channel; syncs to contribution_tracking via trigger.';
