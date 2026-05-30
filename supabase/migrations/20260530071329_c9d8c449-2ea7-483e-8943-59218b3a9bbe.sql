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
  WHERE category = 'owner'
    AND COALESCE(is_active, true) = true
    AND COALESCE(archived, false) = false
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
      NEW.purchase_type::purchase_type,
      v_price,
      'Waiting to be Assigned'::tree_status_type,
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