-- Ensure notification triggers properly notify both tourists and lodges
-- Update the notify_unassigned_tree function to use organization_id
CREATE OR REPLACE FUNCTION public.notify_unassigned_tree()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_users UUID[];
BEGIN
  -- If tree created with lodge_id, notify the lodge
  IF NEW.lodge_id IS NOT NULL THEN
    INSERT INTO notifications (
      recipient_id, 
      recipient_type, 
      notification_type, 
      title, 
      message, 
      related_tree_id, 
      related_lodge_id, 
      priority
    )
    VALUES (
      NEW.lodge_id, -- This is the organization_id
      'lodge',
      'tourist_arrival',
      'New Tree Planting Request',
      'A tourist has requested to plant ' || NEW.num_trees || ' tree(s) with your lodge. Please review and coordinate the planting.',
      NEW.id,
      NEW.lodge_id,
      'high'
    );
    
    -- Also notify the tourist that their request was received
    INSERT INTO notifications (
      recipient_id, 
      recipient_type, 
      notification_type, 
      title, 
      message, 
      related_tree_id, 
      priority
    )
    VALUES (
      NEW.user_id,
      'tourist',
      'tree_assigned',
      'Tree Planting Request Sent',
      'Your request to plant ' || NEW.num_trees || ' tree(s) has been sent to the lodge. They will contact you soon to coordinate the planting.',
      NEW.id,
      'normal'
    );
  ELSE
    -- If no lodge selected, notify admins
    SELECT ARRAY_AGG(ur.user_id)
    INTO admin_users
    FROM user_roles ur
    WHERE ur.role = 'admin'::app_role;
    
    IF admin_users IS NOT NULL THEN
      INSERT INTO notifications (
        recipient_id, 
        recipient_type, 
        notification_type, 
        title, 
        message, 
        related_tree_id, 
        priority
      )
      SELECT 
        unnest(admin_users),
        'admin',
        'lodge_selection',
        'New Tree Purchase Needs Lodge Assignment',
        'A tourist has purchased ' || NEW.num_trees || ' tree(s) but no lodge was selected. Please assign a lodge or plantation partner.',
        NEW.id,
        'high';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to notify tourists when lodge updates tree status
CREATE OR REPLACE FUNCTION public.notify_tree_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create notification if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify tourist about status change
    INSERT INTO notifications (
      recipient_id, 
      recipient_type, 
      notification_type, 
      title, 
      message, 
      related_tree_id, 
      priority
    )
    VALUES (
      NEW.user_id,
      'tourist',
      'tree_status_updated',
      'Tree Status Updated',
      'Your tree status has been updated to: ' || NEW.status || 
      CASE 
        WHEN NEW.status = 'Planted' THEN '. Thank you for contributing to reforestation!'
        WHEN NEW.status = 'Growing' THEN '. Your tree is growing well!'
        ELSE ''
      END,
      NEW.id,
      CASE 
        WHEN NEW.status = 'Planted' THEN 'high'
        ELSE 'normal'
      END
    );
    
    -- If tree was planted, also notify the lodge (confirmation)
    IF NEW.status = 'Planted' AND NEW.lodge_id IS NOT NULL THEN
      INSERT INTO notifications (
        recipient_id, 
        recipient_type, 
        notification_type, 
        title, 
        message, 
        related_tree_id, 
        priority
      )
      VALUES (
        NEW.lodge_id,
        'lodge',
        'tree_planted_confirmation',
        'Tree Successfully Planted',
        'Tree planting recorded successfully. Tourist has been notified.',
        NEW.id,
        'normal'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure triggers are attached
DROP TRIGGER IF EXISTS on_tree_insert ON public.trees;
CREATE TRIGGER on_tree_insert
  AFTER INSERT ON public.trees
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_unassigned_tree();

DROP TRIGGER IF EXISTS on_tree_update ON public.trees;
CREATE TRIGGER on_tree_update
  AFTER UPDATE ON public.trees
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_tree_status_change();