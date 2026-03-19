
-- Auto-allocate trees to the default active stakeholder organization on insert
-- and notify the stakeholder when trees are allocated

CREATE OR REPLACE FUNCTION public.auto_allocate_tree()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  default_org_id UUID;
  stakeholder_users UUID[];
BEGIN
  -- Only auto-allocate if stakeholder_org_id is not already set
  IF NEW.stakeholder_org_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Find the first active stakeholder organization
  SELECT o.id INTO default_org_id
  FROM public.organizations o
  WHERE o.category = 'stakeholder'
    AND o.is_active = true
    AND o.archived = false
  ORDER BY o.created_at ASC
  LIMIT 1;

  IF default_org_id IS NOT NULL THEN
    NEW.stakeholder_org_id := default_org_id;
    NEW.planting_status := 'allocated';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: runs BEFORE INSERT so the row is saved with the allocation
CREATE TRIGGER trg_auto_allocate_tree
  BEFORE INSERT ON public.trees
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_allocate_tree();

-- Notify stakeholder when trees are allocated (runs AFTER INSERT/UPDATE)
CREATE OR REPLACE FUNCTION public.notify_stakeholder_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_name TEXT;
BEGIN
  -- Only fire when stakeholder_org_id is set (and was previously null or this is an insert)
  IF NEW.stakeholder_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if old row already had this stakeholder (no change)
  IF TG_OP = 'UPDATE' AND OLD.stakeholder_org_id = NEW.stakeholder_org_id THEN
    RETURN NEW;
  END IF;

  SELECT name INTO org_name FROM public.organizations WHERE id = NEW.stakeholder_org_id;

  -- Notify the stakeholder organization
  INSERT INTO public.notifications (
    recipient_id,
    recipient_type,
    notification_type,
    title,
    message,
    related_tree_id,
    priority
  ) VALUES (
    NEW.stakeholder_org_id,
    'stakeholder',
    'tree_assignment',
    'New Tree Allocation',
    NEW.num_trees || ' tree(s) have been allocated to ' || COALESCE(org_name, 'your organization') || ' for planting.',
    NEW.id,
    'normal'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_stakeholder_allocation
  AFTER INSERT OR UPDATE OF stakeholder_org_id ON public.trees
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_stakeholder_allocation();
