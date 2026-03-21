-- Allow stakeholders to view travel agents linked to their organization
CREATE POLICY "Stakeholders can view their travel agents"
ON public.travel_agents
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL
  AND organization_id = (
    SELECT users.organization_id
    FROM users
    WHERE users.user_id = auth.uid()
    LIMIT 1
  )
  AND is_stakeholder(auth.uid())
);

-- Allow stakeholders to create travel agents for their organization
CREATE POLICY "Stakeholders can create travel agents"
ON public.travel_agents
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IS NOT NULL
  AND organization_id = (
    SELECT users.organization_id
    FROM users
    WHERE users.user_id = auth.uid()
    LIMIT 1
  )
  AND is_stakeholder(auth.uid())
);

-- Allow stakeholders to update their travel agents
CREATE POLICY "Stakeholders can update their travel agents"
ON public.travel_agents
FOR UPDATE
TO authenticated
USING (
  organization_id IS NOT NULL
  AND organization_id = (
    SELECT users.organization_id
    FROM users
    WHERE users.user_id = auth.uid()
    LIMIT 1
  )
  AND is_stakeholder(auth.uid())
);

-- Allow stakeholders to view agent tickets for their agents
CREATE POLICY "Stakeholders can view their agent tickets"
ON public.agent_tickets
FOR SELECT
TO authenticated
USING (
  agent_id IN (
    SELECT travel_agents.id
    FROM travel_agents
    WHERE travel_agents.organization_id = (
      SELECT users.organization_id
      FROM users
      WHERE users.user_id = auth.uid()
      LIMIT 1
    )
  )
  AND is_stakeholder(auth.uid())
);

-- Allow stakeholders to update agent tickets for their agents
CREATE POLICY "Stakeholders can update their agent tickets"
ON public.agent_tickets
FOR UPDATE
TO authenticated
USING (
  agent_id IN (
    SELECT travel_agents.id
    FROM travel_agents
    WHERE travel_agents.organization_id = (
      SELECT users.organization_id
      FROM users
      WHERE users.user_id = auth.uid()
      LIMIT 1
    )
  )
  AND is_stakeholder(auth.uid())
);