-- Phase 1: Project travel-agent tickets into the unified contribution ledger
-- Two-layer model: agent_tickets (domain) -> contribution_tracking + trees (ledger) via SECURITY DEFINER trigger.

-- 1. Back-reference column on the domain table
ALTER TABLE public.agent_tickets
  ADD COLUMN IF NOT EXISTS contribution_id text;

CREATE INDEX IF NOT EXISTS idx_agent_tickets_contribution_id
  ON public.agent_tickets(contribution_id);

-- 2. Source provenance on the ledger (also serves Phase 2 reconciliation)
ALTER TABLE public.contribution_tracking
  ADD COLUMN IF NOT EXISTS source_table text,
  ADD COLUMN IF NOT EXISTS source_id   uuid;

CREATE INDEX IF NOT EXISTS idx_contribution_tracking_source
  ON public.contribution_tracking(source_table, source_id);

-- 3. Allow agent-origin trees: tourists own trees via auth user, agent rows don't.
ALTER TABLE public.trees
  ALTER COLUMN user_id DROP NOT NULL;

-- 4. Sync function: domain -> ledger (idempotent, one-way)
CREATE OR REPLACE FUNCTION public.sync_agent_ticket_to_contribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _default_partner uuid;
  _contribution_id text;
  _ledger_uuid uuid;
  _ledger_status text;
  _tree_status public.tree_status_type;
  _planting_status public.planting_progress_type;
  _i integer;
  _otot text;
  _is_paid boolean;
BEGIN
  -- Idempotency: only project once per domain row.
  IF NEW.contribution_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Only project rows that represent a real contribution (paid OR planted).
  _is_paid := COALESCE(NEW.offset_amount_paid, 0) > 0
              OR NEW.tree_status = 'Planted'
              OR NEW.ktb_payment_status = 'Paid';
  IF NOT _is_paid THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.trees_needed, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  -- Default plantation partner (same rule as auto_allocate_tree).
  SELECT o.id INTO _default_partner
  FROM public.organizations o
  WHERE o.category = 'owner'
    AND o.is_active = true
    AND COALESCE(o.archived, false) = false
  ORDER BY o.created_at ASC
  LIMIT 1;

  _ledger_status := CASE
    WHEN NEW.tree_status = 'Planted' THEN 'contribution_received'
    ELSE 'contribution_confirmed'
  END;

  _tree_status := CASE
    WHEN NEW.tree_status = 'Planted' THEN 'Planted'::public.tree_status_type
    ELSE 'Waiting to be Assigned'::public.tree_status_type
  END;

  _planting_status := CASE
    WHEN NEW.tree_status = 'Planted' THEN 'sapling_planted'::public.planting_progress_type
    ELSE 'waiting_to_be_assigned'::public.planting_progress_type
  END;

  -- 4a. Insert the ledger row. generate_contribution_id trigger fills contribution_id.
  INSERT INTO public.contribution_tracking (
    contribution_type,
    num_trees,
    amount_paid,
    currency,
    tourist_name,
    payment_date,
    payment_method,
    transaction_reference,
    plantation_partner_id,
    status,
    source_table,
    source_id
  ) VALUES (
    'travel_agent',
    NEW.trees_needed,
    COALESCE(NEW.offset_amount_paid, 0),
    'KES',
    NEW.staff_name,
    COALESCE(NEW.payment_date, NEW.created_at),
    'Agent Offset',
    COALESCE(NEW.ticket_number, NEW.payment_reference),
    _default_partner,
    _ledger_status,
    'agent_tickets',
    NEW.id
  )
  RETURNING contribution_tracking.id, contribution_tracking.contribution_id
    INTO _ledger_uuid, _contribution_id;

  -- 4b. Materialize per-tree rows for plantation operations.
  FOR _i IN 1..NEW.trees_needed LOOP
    _otot := 'AGT-' || substr(replace(NEW.id::text, '-', ''), 1, 8) || '-' || lpad(_i::text, 3, '0');
    INSERT INTO public.trees (
      user_id,
      otot_id,
      num_trees,
      purchase_type,
      amount_paid,
      status,
      planting_status,
      owner_org_id,
      contribution_id,
      payment_method,
      location_name
    ) VALUES (
      NULL,
      _otot,
      1,
      'One-time'::public.purchase_type,
      ROUND(COALESCE(NEW.offset_amount_paid, 0) / NULLIF(NEW.trees_needed, 0), 2),
      _tree_status,
      _planting_status,
      _default_partner,
      _contribution_id,
      'Agent Offset',
      'Mau Forest'
    );
  END LOOP;

  -- 4c. Link the ledger row to the first tree (matches tourist pattern).
  UPDATE public.contribution_tracking ct
  SET tree_id = t.id
  FROM (
    SELECT id FROM public.trees
    WHERE contribution_id = _contribution_id
    ORDER BY created_at ASC LIMIT 1
  ) t
  WHERE ct.id = _ledger_uuid;

  -- 4d. Back-reference on the domain row.
  UPDATE public.agent_tickets
  SET contribution_id = _contribution_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- 5. Triggers: AFTER INSERT, and AFTER UPDATE when state crosses into paid/planted.
DROP TRIGGER IF EXISTS trg_agent_ticket_to_contribution_ins ON public.agent_tickets;
CREATE TRIGGER trg_agent_ticket_to_contribution_ins
  AFTER INSERT ON public.agent_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_agent_ticket_to_contribution();

DROP TRIGGER IF EXISTS trg_agent_ticket_to_contribution_upd ON public.agent_tickets;
CREATE TRIGGER trg_agent_ticket_to_contribution_upd
  AFTER UPDATE OF tree_status, offset_amount_paid, trees_planted, ktb_payment_status
  ON public.agent_tickets
  FOR EACH ROW
  WHEN (NEW.contribution_id IS NULL)
  EXECUTE FUNCTION public.sync_agent_ticket_to_contribution();

-- 6. One-shot backfill of historical paid/planted agent tickets.
DO $backfill$
DECLARE
  _r record;
  _default_partner uuid;
  _contribution_id text;
  _ledger_uuid uuid;
  _ledger_status text;
  _tree_status public.tree_status_type;
  _planting_status public.planting_progress_type;
  _i integer;
  _otot text;
BEGIN
  SELECT o.id INTO _default_partner
  FROM public.organizations o
  WHERE o.category = 'owner'
    AND o.is_active = true
    AND COALESCE(o.archived, false) = false
  ORDER BY o.created_at ASC
  LIMIT 1;

  FOR _r IN
    SELECT *
    FROM public.agent_tickets
    WHERE contribution_id IS NULL
      AND trees_needed > 0
      AND (
        COALESCE(offset_amount_paid, 0) > 0
        OR tree_status = 'Planted'
        OR ktb_payment_status = 'Paid'
      )
  LOOP
    _ledger_status := CASE WHEN _r.tree_status = 'Planted' THEN 'contribution_received' ELSE 'contribution_confirmed' END;
    _tree_status := CASE WHEN _r.tree_status = 'Planted' THEN 'Planted'::public.tree_status_type ELSE 'Waiting to be Assigned'::public.tree_status_type END;
    _planting_status := CASE WHEN _r.tree_status = 'Planted' THEN 'sapling_planted'::public.planting_progress_type ELSE 'waiting_to_be_assigned'::public.planting_progress_type END;

    INSERT INTO public.contribution_tracking (
      contribution_type, num_trees, amount_paid, currency, tourist_name,
      payment_date, payment_method, transaction_reference, plantation_partner_id,
      status, source_table, source_id
    ) VALUES (
      'travel_agent', _r.trees_needed, COALESCE(_r.offset_amount_paid, 0), 'KES', _r.staff_name,
      COALESCE(_r.payment_date, _r.created_at), 'Agent Offset',
      COALESCE(_r.ticket_number, _r.payment_reference), _default_partner,
      _ledger_status, 'agent_tickets', _r.id
    )
    RETURNING contribution_tracking.id, contribution_tracking.contribution_id
      INTO _ledger_uuid, _contribution_id;

    FOR _i IN 1.._r.trees_needed LOOP
      _otot := 'AGT-' || substr(replace(_r.id::text, '-', ''), 1, 8) || '-' || lpad(_i::text, 3, '0');
      INSERT INTO public.trees (
        user_id, otot_id, num_trees, purchase_type, amount_paid,
        status, planting_status, owner_org_id, contribution_id, payment_method, location_name
      ) VALUES (
        NULL, _otot, 1, 'One-time'::public.purchase_type,
        ROUND(COALESCE(_r.offset_amount_paid, 0) / NULLIF(_r.trees_needed, 0), 2),
        _tree_status, _planting_status, _default_partner, _contribution_id, 'Agent Offset', 'Mau Forest'
      );
    END LOOP;

    UPDATE public.contribution_tracking ct
    SET tree_id = (
      SELECT id FROM public.trees WHERE contribution_id = _contribution_id ORDER BY created_at ASC LIMIT 1
    )
    WHERE ct.id = _ledger_uuid;

    UPDATE public.agent_tickets SET contribution_id = _contribution_id WHERE id = _r.id;
  END LOOP;
END;
$backfill$;