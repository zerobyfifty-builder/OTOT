ALTER TABLE public.contribution_tracking
ADD COLUMN tech_receipt_id text DEFAULT NULL,
ADD COLUMN tech_received_date date DEFAULT NULL;