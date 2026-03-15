-- Add organization_id to travel_agents to scope agents per institutional partner
ALTER TABLE public.travel_agents 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Allow institutional partners to view their own travel agents
CREATE POLICY "Institutional partners can view their travel agents"
ON public.travel_agents
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL 
  AND organization_id = (SELECT organization_id FROM public.users WHERE user_id = auth.uid() LIMIT 1)
);

-- Allow institutional partners to insert travel agents for their org
CREATE POLICY "Institutional partners can create travel agents"
ON public.travel_agents
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IS NOT NULL 
  AND organization_id = (SELECT organization_id FROM public.users WHERE user_id = auth.uid() LIMIT 1)
);

-- Allow institutional partners to update their own travel agents
CREATE POLICY "Institutional partners can update their travel agents"
ON public.travel_agents
FOR UPDATE
TO authenticated
USING (
  organization_id IS NOT NULL 
  AND organization_id = (SELECT organization_id FROM public.users WHERE user_id = auth.uid() LIMIT 1)
);

-- Allow institutional partners to view tickets from their agents
CREATE POLICY "Institutional partners can view their agent tickets"
ON public.agent_tickets
FOR SELECT
TO authenticated
USING (
  agent_id IN (
    SELECT id FROM public.travel_agents 
    WHERE organization_id = (SELECT organization_id FROM public.users WHERE user_id = auth.uid() LIMIT 1)
  )
);

-- Allow institutional partners to update tickets from their agents  
CREATE POLICY "Institutional partners can update their agent tickets"
ON public.agent_tickets
FOR UPDATE
TO authenticated
USING (
  agent_id IN (
    SELECT id FROM public.travel_agents 
    WHERE organization_id = (SELECT organization_id FROM public.users WHERE user_id = auth.uid() LIMIT 1)
  )
);