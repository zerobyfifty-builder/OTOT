-- Create notifications table for system-wide alerts
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('tourist', 'lodge', 'admin')),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('tree_assignment', 'lodge_selection', 'payment_received', 'tree_planted', 'reimbursement_request', 'reimbursement_approved', 'tourist_arrival', 'task_pending', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_tree_id UUID REFERENCES trees(id) ON DELETE CASCADE,
  related_trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  related_lodge_id UUID REFERENCES lodges(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = recipient_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Create function to automatically notify when tree is created without lodge
CREATE OR REPLACE FUNCTION notify_unassigned_tree()
RETURNS TRIGGER AS $$
DECLARE
  admin_users UUID[];
BEGIN
  -- If tree created without lodge_id, notify all admins
  IF NEW.lodge_id IS NULL THEN
    -- Get all admin user IDs
    SELECT ARRAY_AGG(ur.user_id)
    INTO admin_users
    FROM user_roles ur
    WHERE ur.role = 'admin'::app_role;
    
    -- Create notifications for each admin
    IF admin_users IS NOT NULL THEN
      INSERT INTO notifications (recipient_id, recipient_type, notification_type, title, message, related_tree_id, priority)
      SELECT 
        unnest(admin_users),
        'admin',
        'lodge_selection',
        'New Tree Purchase Needs Lodge Assignment',
        'A tourist has purchased ' || NEW.num_trees || ' tree(s) but no lodge was selected. Please assign a lodge or plantation partner.',
        NEW.id,
        'high';
    END IF;
  -- If tree assigned to lodge, notify the lodge
  ELSE
    INSERT INTO notifications (recipient_id, recipient_type, notification_type, title, message, related_tree_id, related_lodge_id, priority)
    VALUES (
      NEW.user_id,
      'lodge',
      'tourist_arrival',
      'New Tree Planting Assignment',
      'A tourist has selected your lodge for planting ' || NEW.num_trees || ' tree(s). Please coordinate with them for the planting activity.',
      NEW.id,
      NEW.lodge_id,
      'high'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new tree notifications
CREATE TRIGGER trigger_notify_unassigned_tree
  AFTER INSERT ON trees
  FOR EACH ROW
  EXECUTE FUNCTION notify_unassigned_tree();

-- Create function to notify when tree status changes
CREATE OR REPLACE FUNCTION notify_tree_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    -- Notify tourist about status change
    INSERT INTO notifications (recipient_id, recipient_type, notification_type, title, message, related_tree_id, priority)
    VALUES (
      NEW.user_id,
      'tourist',
      'tree_planted',
      'Tree Status Updated',
      'Your tree status has been updated to: ' || NEW.status,
      NEW.id,
      'normal'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for tree status changes
CREATE TRIGGER trigger_notify_tree_status_change
  AFTER UPDATE ON trees
  FOR EACH ROW
  EXECUTE FUNCTION notify_tree_status_change();

-- Create function to notify when reimbursement is created
CREATE OR REPLACE FUNCTION notify_reimbursement_created()
RETURNS TRIGGER AS $$
DECLARE
  admin_users UUID[];
BEGIN
  -- Get all admin user IDs
  SELECT ARRAY_AGG(ur.user_id)
  INTO admin_users
  FROM user_roles ur
  WHERE ur.role = 'admin'::app_role;
  
  -- Notify all admins
  IF admin_users IS NOT NULL THEN
    INSERT INTO notifications (recipient_id, recipient_type, notification_type, title, message, priority)
    SELECT 
      unnest(admin_users),
      'admin',
      'reimbursement_request',
      'New Reimbursement Request',
      'A lodge has submitted a reimbursement request for $' || NEW.amount,
      'high';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for reimbursement notifications
CREATE TRIGGER trigger_notify_reimbursement_created
  AFTER INSERT ON reimbursements
  FOR EACH ROW
  EXECUTE FUNCTION notify_reimbursement_created();