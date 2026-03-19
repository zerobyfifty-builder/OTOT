-- Add 'stakeholder' to the recipient_type check constraint
ALTER TABLE public.notifications DROP CONSTRAINT notifications_recipient_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_recipient_type_check
  CHECK (recipient_type = ANY (ARRAY['tourist','lodge','admin','stakeholder']));
