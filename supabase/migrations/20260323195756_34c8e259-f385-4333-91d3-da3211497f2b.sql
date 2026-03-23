ALTER TABLE public.contribution_tracking
ADD COLUMN institution_receipt_id text DEFAULT NULL,
ADD COLUMN institution_received_date date DEFAULT NULL;