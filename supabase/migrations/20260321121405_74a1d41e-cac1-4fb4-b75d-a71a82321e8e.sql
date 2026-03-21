-- Stakeholders with travel_agents module can view all trips
CREATE POLICY "Stakeholders with travel_agents module can view all trips"
ON public.trips
FOR SELECT
TO authenticated
USING (
  is_stakeholder(auth.uid()) AND stakeholder_has_module(auth.uid(), 'travel_agents')
);