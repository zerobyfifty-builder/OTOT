UPDATE trees SET planting_status = 'waiting_to_be_assigned' WHERE planting_status = 'pending_allocation';
UPDATE trees SET planting_status = 'verified' WHERE planting_status = 'monitored';
UPDATE trees SET planting_status = 'saplings_ready' WHERE planting_status = 'funds_received';
UPDATE trees SET planting_status = 'planting_scheduled' WHERE planting_status = 'funds_pending';
UPDATE trees SET planting_status = 'sapling_planted' WHERE planting_status = 'planting_in_progress';

-- Update the auto_allocate_tree function to use new status
CREATE OR REPLACE FUNCTION public.auto_allocate_tree()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  default_org_id UUID;
BEGIN
  IF NEW.stakeholder_org_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT o.id INTO default_org_id
  FROM public.organizations o
  WHERE o.category = 'stakeholder'
    AND o.is_active = true
    AND o.archived = false
  ORDER BY o.created_at ASC
  LIMIT 1;
  IF default_org_id IS NOT NULL THEN
    NEW.stakeholder_org_id := default_org_id;
    NEW.planting_status := 'assigned';
  END IF;
  RETURN NEW;
END;
$function$;