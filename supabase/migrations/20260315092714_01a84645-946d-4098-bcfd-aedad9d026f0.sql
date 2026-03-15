
-- Create enums for agent ticket statuses
CREATE TYPE public.agent_tree_status AS ENUM ('Not Planted', 'Planted');
CREATE TYPE public.agent_ktb_payment_status AS ENUM ('Payment Due', 'Paid');

-- Create travel_agents table (mirrors lodges pattern)
CREATE TABLE public.travel_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  username TEXT UNIQUE,
  password_hash TEXT,
  contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create travel_agent_sessions table (mirrors lodge_sessions)
CREATE TABLE public.travel_agent_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.travel_agents(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_tickets table
CREATE TABLE public.agent_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.travel_agents(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'KTB',
  lpo_number TEXT NOT NULL,
  pnr_number TEXT NOT NULL,
  ticket_number TEXT NOT NULL,
  ticket_issue_date DATE NOT NULL,
  origin_airport TEXT NOT NULL,
  destination_airport TEXT NOT NULL,
  travel_class TEXT NOT NULL DEFAULT 'Economy',
  is_return BOOLEAN NOT NULL DEFAULT false,
  from_date DATE NOT NULL,
  to_date DATE,
  num_travelers INTEGER NOT NULL DEFAULT 1,
  flight_co2 NUMERIC NOT NULL DEFAULT 0,
  accommodation_co2 NUMERIC NOT NULL DEFAULT 0,
  accommodation_type TEXT,
  total_co2 NUMERIC NOT NULL DEFAULT 0,
  trees_needed INTEGER NOT NULL DEFAULT 0,
  trees_planted INTEGER NOT NULL DEFAULT 0,
  tree_status public.agent_tree_status NOT NULL DEFAULT 'Not Planted',
  offset_amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_reference TEXT,
  ktb_payment_status public.agent_ktb_payment_status NOT NULL DEFAULT 'Payment Due',
  ktb_payment_date TIMESTAMP WITH TIME ZONE,
  ktb_payment_reference TEXT,
  invoice_url TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.travel_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tickets ENABLE ROW LEVEL SECURITY;

-- RLS for travel_agents
CREATE POLICY "Admins can manage travel agents" ON public.travel_agents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view active travel agents" ON public.travel_agents
  FOR SELECT TO public
  USING (is_active = true);

-- RLS for travel_agent_sessions (open like lodge_sessions for session-based auth)
CREATE POLICY "Anyone can create agent sessions" ON public.travel_agent_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can view agent sessions" ON public.travel_agent_sessions
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can update agent sessions" ON public.travel_agent_sessions
  FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Anyone can delete agent sessions" ON public.travel_agent_sessions
  FOR DELETE TO anon, authenticated USING (true);

-- RLS for agent_tickets
CREATE POLICY "Admins can manage all agent tickets" ON public.agent_tickets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert agent tickets" ON public.agent_tickets
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can view agent tickets" ON public.agent_tickets
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can update agent tickets" ON public.agent_tickets
  FOR UPDATE TO anon, authenticated USING (true);

-- Session validation function for travel agents
CREATE OR REPLACE FUNCTION public.is_agent_session_valid(_session_token text, _agent_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.travel_agent_sessions
    WHERE session_token = _session_token
      AND agent_id = _agent_id
      AND expires_at > now()
  )
$$;

-- Updated_at trigger for travel_agents
CREATE TRIGGER update_travel_agents_updated_at
  BEFORE UPDATE ON public.travel_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Updated_at trigger for agent_tickets
CREATE TRIGGER update_agent_tickets_updated_at
  BEFORE UPDATE ON public.agent_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
