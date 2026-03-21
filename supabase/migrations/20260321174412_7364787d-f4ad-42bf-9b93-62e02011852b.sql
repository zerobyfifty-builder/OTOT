-- Create contribution tracking table for the full financial lifecycle
CREATE TABLE public.contribution_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id text NOT NULL UNIQUE,
  tree_id uuid REFERENCES public.trees(id) ON DELETE SET NULL,
  tourist_name text,
  country text,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  amount_paid numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  payment_date timestamptz,
  payment_method text,
  transaction_reference text,
  
  -- KTB receipt fields
  ktb_receipt_id text,
  ktb_received_date date,
  plantation_partner_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  transfer_date date,
  transfer_reference text,
  
  -- Partner confirmation fields
  partner_receipt_confirmation boolean DEFAULT false,
  partner_received_date date,
  acknowledgement_doc text,
  
  -- Status tracking
  status text NOT NULL DEFAULT 'contribution_received',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sequence for contribution IDs
CREATE SEQUENCE IF NOT EXISTS contribution_id_seq START 1;

-- Auto-generate contribution_id
CREATE OR REPLACE FUNCTION public.generate_contribution_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contribution_id IS NULL OR NEW.contribution_id = '' THEN
    NEW.contribution_id := 'CTR-' || LPAD(nextval('contribution_id_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_contribution_id
  BEFORE INSERT ON public.contribution_tracking
  FOR EACH ROW EXECUTE FUNCTION generate_contribution_id();

-- Updated_at trigger
CREATE TRIGGER trg_contribution_tracking_updated_at
  BEFORE UPDATE ON public.contribution_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.contribution_tracking ENABLE ROW LEVEL SECURITY;

-- Super admins full access
CREATE POLICY "sa_contribution_tracking"
  ON public.contribution_tracking FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Stakeholders with financial module can read
CREATE POLICY "stakeholders_read_contribution_tracking"
  ON public.contribution_tracking FOR SELECT
  TO authenticated
  USING (is_stakeholder(auth.uid()));

-- Institutional partners can read and update (KTB fields)
CREATE POLICY "institutional_read_contribution_tracking"
  ON public.contribution_tracking FOR SELECT
  TO authenticated
  USING (is_institutional_partner(auth.uid()));

CREATE POLICY "institutional_update_contribution_tracking"
  ON public.contribution_tracking FOR UPDATE
  TO authenticated
  USING (is_institutional_partner(auth.uid()));

-- Stakeholders can update their own partner confirmation fields
CREATE POLICY "stakeholders_update_contribution_tracking"
  ON public.contribution_tracking FOR UPDATE
  TO authenticated
  USING (
    is_stakeholder(auth.uid()) 
    AND plantation_partner_id = get_user_organization(auth.uid())
  );