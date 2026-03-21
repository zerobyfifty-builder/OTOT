-- Allow stakeholders with tree_management module to view all trees
CREATE POLICY "Stakeholders with tree_management can view trees"
  ON public.trees FOR SELECT
  TO authenticated
  USING (
    stakeholder_has_module_permission(auth.uid(), 'tree_management', 'read')
  );

-- Allow stakeholders with trip_management module to view all trips
CREATE POLICY "Stakeholders with trip_management can view trips"
  ON public.trips FOR SELECT
  TO authenticated
  USING (
    stakeholder_has_module_permission(auth.uid(), 'trip_management', 'read')
  );