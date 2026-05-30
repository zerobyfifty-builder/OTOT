-- Phase 2: reconciliation guardrails

-- Enable pg_cron for the nightly schedule (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drift view: ledger row vs its source-of-truth domain row.
-- Extend the UNION as new channels gain domain tables.
CREATE OR REPLACE VIEW public.v_contribution_source_drift AS
SELECT
  ct.id                AS ledger_id,
  ct.contribution_id,
  ct.source_table,
  ct.source_id,
  ct.num_trees         AS ledger_num_trees,
  at.trees_needed      AS source_num_trees,
  ct.amount_paid       AS ledger_amount_paid,
  at.offset_amount_paid AS source_amount_paid,
  ct.currency          AS ledger_currency,
  CASE
    WHEN at.id IS NULL THEN 'orphan_ledger'
    WHEN ct.num_trees    <> at.trees_needed       THEN 'trees_mismatch'
    WHEN ct.amount_paid  <> at.offset_amount_paid THEN 'amount_mismatch'
    ELSE 'ok'
  END AS drift_type
FROM public.contribution_tracking ct
LEFT JOIN public.agent_tickets at ON at.id = ct.source_id
WHERE ct.source_table = 'agent_tickets'
  AND (
    at.id IS NULL
    OR ct.num_trees    <> at.trees_needed
    OR ct.amount_paid  <> at.offset_amount_paid
  );

GRANT SELECT ON public.v_contribution_source_drift TO authenticated, service_role;

-- Reconciliation routine: log every current drift to mdm_audit_log.
-- Idempotent per-day: skips drifts already logged today for the same ledger row.
CREATE OR REPLACE FUNCTION public.reconcile_contribution_sources()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r record;
  _logged integer := 0;
BEGIN
  FOR _r IN SELECT * FROM public.v_contribution_source_drift LOOP
    IF EXISTS (
      SELECT 1 FROM public.mdm_audit_log
      WHERE module_id = 'contribution_source_drift'
        AND record_id = _r.ledger_id
        AND changed_at::date = CURRENT_DATE
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.mdm_audit_log (module_id, record_id, action, old_values, new_values)
    VALUES (
      'contribution_source_drift',
      _r.ledger_id,
      _r.drift_type,
      jsonb_build_object(
        'num_trees',   _r.source_num_trees,
        'amount_paid', _r.source_amount_paid,
        'source_table', _r.source_table,
        'source_id',   _r.source_id
      ),
      jsonb_build_object(
        'num_trees',   _r.ledger_num_trees,
        'amount_paid', _r.ledger_amount_paid,
        'contribution_id', _r.contribution_id,
        'currency',    _r.ledger_currency
      )
    );
    _logged := _logged + 1;
  END LOOP;

  RETURN _logged;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_contribution_sources() TO authenticated, service_role;

-- Schedule nightly at 02:15 UTC (idempotent: unschedule if already exists)
DO $cron$
BEGIN
  PERFORM cron.unschedule('reconcile_contribution_sources_nightly')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'reconcile_contribution_sources_nightly'
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$cron$;

SELECT cron.schedule(
  'reconcile_contribution_sources_nightly',
  '15 2 * * *',
  $$SELECT public.reconcile_contribution_sources();$$
);