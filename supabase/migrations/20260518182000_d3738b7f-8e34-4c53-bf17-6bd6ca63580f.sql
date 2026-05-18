
BEGIN;

-- =========================================================
-- 1. DROP all policies that reference soon-renamed functions/columns
-- =========================================================
DROP POLICY IF EXISTS "Stakeholders can update their agent tickets" ON public.agent_tickets;
DROP POLICY IF EXISTS "Stakeholders can view their agent tickets" ON public.agent_tickets;
DROP POLICY IF EXISTS sh_carbon_metrics_logs ON public.carbon_metrics_logs;
DROP POLICY IF EXISTS sh_community_impact ON public.community_impact;
DROP POLICY IF EXISTS sh_community_impact_logs ON public.community_impact_logs;
DROP POLICY IF EXISTS stakeholders_read_contribution_tracking ON public.contribution_tracking;
DROP POLICY IF EXISTS stakeholders_update_contribution_tracking ON public.contribution_tracking;
DROP POLICY IF EXISTS sh_ecosystem_impact_logs ON public.ecosystem_impact_logs;
DROP POLICY IF EXISTS "Stakeholders and admins can view engagement activities" ON public.engagement_activities;
DROP POLICY IF EXISTS sh_impact_metrics ON public.impact_metrics;
DROP POLICY IF EXISTS sh_beats ON public.mdm_location_beats;
DROP POLICY IF EXISTS sh_blocks ON public.mdm_location_blocks;
DROP POLICY IF EXISTS sh_counties ON public.mdm_location_counties;
DROP POLICY IF EXISTS sh_stations ON public.mdm_location_stations;
DROP POLICY IF EXISTS sh_subcounties ON public.mdm_location_subcounties;
DROP POLICY IF EXISTS sh_monitoring_logs ON public.monitoring_logs;
DROP POLICY IF EXISTS sh_monitoring_records ON public.monitoring_records;
DROP POLICY IF EXISTS sh_nurseries ON public.nurseries;
DROP POLICY IF EXISTS sh_nursery_species ON public.nursery_species;
DROP POLICY IF EXISTS "Stakeholders with payment_management can view transactions" ON public.partner_transactions;
DROP POLICY IF EXISTS institutional_select_active_configs ON public.planting_cost_configs;
DROP POLICY IF EXISTS stakeholders_select_notifications ON public.planting_cost_notifications;
DROP POLICY IF EXISTS stakeholders_insert_own_submissions ON public.planting_cost_submissions;
DROP POLICY IF EXISTS stakeholders_select_own_submissions ON public.planting_cost_submissions;
DROP POLICY IF EXISTS sh_planting_records ON public.planting_records;
DROP POLICY IF EXISTS sh_seed_species_manage ON public.seed_species;
DROP POLICY IF EXISTS sh_seedling_batches ON public.seedling_batches;
DROP POLICY IF EXISTS sh_disbursements ON public.stakeholder_disbursements;
DROP POLICY IF EXISTS "Stakeholders can create travel agents" ON public.travel_agents;
DROP POLICY IF EXISTS "Stakeholders can update their travel agents" ON public.travel_agents;
DROP POLICY IF EXISTS "Stakeholders can view their travel agents" ON public.travel_agents;
DROP POLICY IF EXISTS sh_insert_tree_carers ON public.tree_carers;
DROP POLICY IF EXISTS sh_select_tree_carers ON public.tree_carers;
DROP POLICY IF EXISTS sh_update_tree_carers ON public.tree_carers;
DROP POLICY IF EXISTS sh_tree_geotags ON public.tree_geotags;
DROP POLICY IF EXISTS sh_tree_growth ON public.tree_growth_metrics;
DROP POLICY IF EXISTS sh_tree_impact_records ON public.tree_impact_records;
DROP POLICY IF EXISTS sh_tree_monitoring_logs ON public.tree_monitoring_logs;
DROP POLICY IF EXISTS sh_tree_planting_assignments ON public.tree_planting_assignments;
DROP POLICY IF EXISTS sh_tree_status_transitions ON public.tree_status_transitions;
DROP POLICY IF EXISTS sh_tree_survival_records ON public.tree_survival_records;
DROP POLICY IF EXISTS sh_tree_survival ON public.tree_survival_tracking;
DROP POLICY IF EXISTS "Stakeholders can update allocated trees" ON public.trees;
DROP POLICY IF EXISTS "Stakeholders can view allocated trees" ON public.trees;
DROP POLICY IF EXISTS "Stakeholders with tree_management can view trees" ON public.trees;
DROP POLICY IF EXISTS "Stakeholders with tree_orders module can update all trees" ON public.trees;
DROP POLICY IF EXISTS "Stakeholders with tree_orders module can view all trees" ON public.trees;
DROP POLICY IF EXISTS "Stakeholders with travel_agents module can view all trips" ON public.trips;
DROP POLICY IF EXISTS "Stakeholders with trip_management can view trips" ON public.trips;

-- =========================================================
-- 2. Drop triggers + functions that will be recreated
-- =========================================================
DROP TRIGGER IF EXISTS trg_notify_stakeholder_allocation ON public.trees;
DROP TRIGGER IF EXISTS trg_auto_allocate_tree ON public.trees;
DROP TRIGGER IF EXISTS update_stakeholder_disbursements_updated_at ON public.stakeholder_disbursements;

DROP FUNCTION IF EXISTS public.notify_stakeholder_allocation();
DROP FUNCTION IF EXISTS public.auto_allocate_tree();
DROP FUNCTION IF EXISTS public.is_stakeholder(uuid);
DROP FUNCTION IF EXISTS public.stakeholder_has_module(uuid, text);
DROP FUNCTION IF EXISTS public.stakeholder_has_module_permission(uuid, text, text);

-- =========================================================
-- 3. Rename tables & columns
-- =========================================================
ALTER TABLE public.stakeholder_disbursements RENAME TO owner_disbursements;
ALTER TABLE public.owner_disbursements RENAME COLUMN stakeholder_org_id TO owner_org_id;

ALTER TABLE public.community_impact RENAME COLUMN stakeholder_org_id TO owner_org_id;
ALTER TABLE public.nurseries RENAME COLUMN stakeholder_org_id TO owner_org_id;
ALTER TABLE public.planting_records RENAME COLUMN stakeholder_org_id TO owner_org_id;
ALTER TABLE public.trees RENAME COLUMN stakeholder_org_id TO owner_org_id;
ALTER TABLE public.planting_cost_submissions RENAME COLUMN stakeholder_org TO owner_org;
ALTER TABLE public.org_job_role_defaults RENAME COLUMN stakeholder_type TO owner_type;

-- =========================================================
-- 4. Drop CHECK constraints, update data, recreate constraints
-- =========================================================
ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_role_category_check;
ALTER TABLE public.partner_types DROP CONSTRAINT IF EXISTS partner_types_category_check;
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_category_check;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_recipient_type_check;

UPDATE public.roles SET role_category = 'owner' WHERE role_category = 'stakeholder';
UPDATE public.roles SET name = 'owner', display_name = 'Owner' WHERE name = 'stakeholder';
UPDATE public.partner_types SET category = 'owner' WHERE category = 'stakeholder';
UPDATE public.organizations SET category = 'owner' WHERE category = 'stakeholder';
UPDATE public.notifications SET recipient_type = 'owner' WHERE recipient_type = 'stakeholder';

ALTER TABLE public.roles
  ADD CONSTRAINT roles_role_category_check
  CHECK (role_category = ANY (ARRAY['god_mode'::text,'institutional'::text,'business'::text,'tourist'::text,'owner'::text]));
ALTER TABLE public.partner_types
  ADD CONSTRAINT partner_types_category_check
  CHECK (category = ANY (ARRAY['institutional'::text,'business'::text,'owner'::text]));
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_category_check
  CHECK (category = ANY (ARRAY['institutional'::text,'business'::text,'owner'::text]));
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_recipient_type_check
  CHECK (recipient_type = ANY (ARRAY['tourist'::text,'lodge'::text,'admin'::text,'owner'::text]));

-- =========================================================
-- 5. Recreate functions with new names
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_owner(user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.user_id = user_id AND r.name = 'owner'); $$;

CREATE OR REPLACE FUNCTION public.owner_has_module(_user_id uuid, _module_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.organization_modules om ON om.organization_id = u.organization_id
    JOIN public.modules m ON m.id = om.module_id
    WHERE u.user_id = _user_id AND m.name = _module_name
      AND om.is_active = true AND m.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.owner_has_module_permission(_user_id uuid, _module_name text, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.organization_modules om ON om.organization_id = u.organization_id
    JOIN public.modules m ON m.id = om.module_id
    WHERE u.user_id = _user_id AND m.name = _module_name
      AND om.is_active = true AND m.is_active = true
      AND om.permissions @> to_jsonb(_permission)
  )
$$;

CREATE OR REPLACE FUNCTION public.auto_allocate_tree()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE default_org_id UUID;
BEGIN
  IF NEW.owner_org_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT o.id INTO default_org_id FROM public.organizations o
  WHERE o.category = 'owner' AND o.is_active = true AND o.archived = false
  ORDER BY o.created_at ASC LIMIT 1;
  IF default_org_id IS NOT NULL THEN
    NEW.owner_org_id := default_org_id;
    NEW.planting_status := 'waiting_to_be_assigned';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_owner_allocation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE org_name TEXT;
BEGIN
  IF NEW.owner_org_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.owner_org_id = NEW.owner_org_id THEN RETURN NEW; END IF;
  SELECT name INTO org_name FROM public.organizations WHERE id = NEW.owner_org_id;
  INSERT INTO public.notifications (recipient_id, recipient_type, notification_type, title, message, related_tree_id, priority)
  VALUES (NEW.owner_org_id, 'owner', 'tree_assignment', 'New Tree Allocation',
    NEW.num_trees || ' tree(s) have been allocated to ' || COALESCE(org_name, 'your organization') || ' for planting.',
    NEW.id, 'normal');
  RETURN NEW;
END; $$;

-- =========================================================
-- 6. Recreate triggers
-- =========================================================
CREATE TRIGGER trg_auto_allocate_tree BEFORE INSERT ON public.trees
  FOR EACH ROW EXECUTE FUNCTION public.auto_allocate_tree();
CREATE TRIGGER trg_notify_owner_allocation AFTER INSERT OR UPDATE OF owner_org_id ON public.trees
  FOR EACH ROW EXECUTE FUNCTION public.notify_owner_allocation();
CREATE TRIGGER update_owner_disbursements_updated_at BEFORE UPDATE ON public.owner_disbursements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 7. Recreate all RLS policies with new names/references
-- =========================================================
CREATE POLICY "Owners can view their agent tickets" ON public.agent_tickets FOR SELECT TO authenticated
USING ((agent_id IN (SELECT travel_agents.id FROM travel_agents
  WHERE travel_agents.organization_id = (SELECT users.organization_id FROM users WHERE users.user_id = auth.uid() LIMIT 1)))
  AND is_owner(auth.uid()));
CREATE POLICY "Owners can update their agent tickets" ON public.agent_tickets FOR UPDATE TO authenticated
USING ((agent_id IN (SELECT travel_agents.id FROM travel_agents
  WHERE travel_agents.organization_id = (SELECT users.organization_id FROM users WHERE users.user_id = auth.uid() LIMIT 1)))
  AND is_owner(auth.uid()));

CREATE POLICY ow_carbon_metrics_logs ON public.carbon_metrics_logs FOR ALL TO authenticated
USING (is_owner(auth.uid())) WITH CHECK (is_owner(auth.uid()));

CREATE POLICY ow_community_impact ON public.community_impact FOR ALL
USING (is_owner(auth.uid()) AND (owner_org_id = get_user_organization(auth.uid())))
WITH CHECK (is_owner(auth.uid()) AND (owner_org_id = get_user_organization(auth.uid())));

CREATE POLICY ow_community_impact_logs ON public.community_impact_logs FOR ALL TO authenticated
USING (is_owner(auth.uid())) WITH CHECK (is_owner(auth.uid()));

CREATE POLICY owners_read_contribution_tracking ON public.contribution_tracking FOR SELECT TO authenticated
USING (is_owner(auth.uid()));
CREATE POLICY owners_update_contribution_tracking ON public.contribution_tracking FOR UPDATE TO authenticated
USING (is_owner(auth.uid()) AND (plantation_partner_id = get_user_organization(auth.uid())));

CREATE POLICY ow_ecosystem_impact_logs ON public.ecosystem_impact_logs FOR ALL TO authenticated
USING (is_owner(auth.uid())) WITH CHECK (is_owner(auth.uid()));

CREATE POLICY "Owners and admins can view engagement activities" ON public.engagement_activities FOR SELECT TO authenticated
USING (is_owner(auth.uid()) OR is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY ow_impact_metrics ON public.impact_metrics FOR ALL TO authenticated
USING (is_owner(auth.uid())) WITH CHECK (is_owner(auth.uid()));

CREATE POLICY ow_beats ON public.mdm_location_beats FOR ALL TO authenticated
USING (owner_has_module(auth.uid(), 'mdm_locations'::text)) WITH CHECK (owner_has_module(auth.uid(), 'mdm_locations'::text));
CREATE POLICY ow_blocks ON public.mdm_location_blocks FOR ALL TO authenticated
USING (owner_has_module(auth.uid(), 'mdm_locations'::text)) WITH CHECK (owner_has_module(auth.uid(), 'mdm_locations'::text));
CREATE POLICY ow_counties ON public.mdm_location_counties FOR ALL TO authenticated
USING (owner_has_module(auth.uid(), 'mdm_locations'::text)) WITH CHECK (owner_has_module(auth.uid(), 'mdm_locations'::text));
CREATE POLICY ow_stations ON public.mdm_location_stations FOR ALL TO authenticated
USING (owner_has_module(auth.uid(), 'mdm_locations'::text)) WITH CHECK (owner_has_module(auth.uid(), 'mdm_locations'::text));
CREATE POLICY ow_subcounties ON public.mdm_location_subcounties FOR ALL TO authenticated
USING (owner_has_module(auth.uid(), 'mdm_locations'::text)) WITH CHECK (owner_has_module(auth.uid(), 'mdm_locations'::text));

CREATE POLICY ow_monitoring_logs ON public.monitoring_logs FOR ALL TO authenticated
USING (is_owner(auth.uid())) WITH CHECK (is_owner(auth.uid()));

CREATE POLICY ow_monitoring_records ON public.monitoring_records FOR ALL
USING (is_owner(auth.uid()) AND (planting_record_id IN (SELECT planting_records.id FROM planting_records
  WHERE planting_records.owner_org_id = get_user_organization(auth.uid()))))
WITH CHECK (is_owner(auth.uid()) AND (planting_record_id IN (SELECT planting_records.id FROM planting_records
  WHERE planting_records.owner_org_id = get_user_organization(auth.uid()))));

CREATE POLICY ow_nurseries ON public.nurseries FOR ALL
USING (is_owner(auth.uid()) AND (owner_org_id = get_user_organization(auth.uid())))
WITH CHECK (is_owner(auth.uid()) AND (owner_org_id = get_user_organization(auth.uid())));

CREATE POLICY ow_nursery_species ON public.nursery_species FOR ALL
USING (is_owner(auth.uid()) AND (nursery_id IN (SELECT nurseries.id FROM nurseries WHERE nurseries.owner_org_id = get_user_organization(auth.uid()))))
WITH CHECK (is_owner(auth.uid()) AND (nursery_id IN (SELECT nurseries.id FROM nurseries WHERE nurseries.owner_org_id = get_user_organization(auth.uid()))));

CREATE POLICY "Owners with payment_management can view transactions" ON public.partner_transactions FOR SELECT
USING (owner_has_module_permission(auth.uid(), 'payment_management'::text, 'read'::text));

CREATE POLICY institutional_select_active_configs ON public.planting_cost_configs FOR SELECT
USING ((is_active = true) AND (is_institutional_partner(auth.uid()) OR is_owner(auth.uid())));

CREATE POLICY owners_select_notifications ON public.planting_cost_notifications FOR SELECT
USING (((recipient_role = 'plantation'::text) AND is_owner(auth.uid()))
    OR ((recipient_role = 'ktb'::text) AND is_institutional_partner(auth.uid())));

CREATE POLICY owners_insert_own_submissions ON public.planting_cost_submissions FOR INSERT
WITH CHECK ((submitted_by = auth.uid()) AND (is_owner(auth.uid()) OR is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY owners_select_own_submissions ON public.planting_cost_submissions FOR SELECT
USING (is_owner(auth.uid()) OR is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY ow_planting_records ON public.planting_records FOR ALL
USING (is_owner(auth.uid()) AND (owner_org_id = get_user_organization(auth.uid())))
WITH CHECK (is_owner(auth.uid()) AND (owner_org_id = get_user_organization(auth.uid())));

CREATE POLICY ow_seed_species_manage ON public.seed_species FOR ALL TO authenticated
USING (owner_has_module(auth.uid(), 'mdm_species'::text)) WITH CHECK (owner_has_module(auth.uid(), 'mdm_species'::text));

CREATE POLICY ow_seedling_batches ON public.seedling_batches FOR ALL
USING (is_owner(auth.uid()) AND (nursery_id IN (SELECT nurseries.id FROM nurseries WHERE nurseries.owner_org_id = get_user_organization(auth.uid()))))
WITH CHECK (is_owner(auth.uid()) AND (nursery_id IN (SELECT nurseries.id FROM nurseries WHERE nurseries.owner_org_id = get_user_organization(auth.uid()))));

CREATE POLICY ow_disbursements ON public.owner_disbursements FOR ALL
USING (is_owner(auth.uid()) AND (owner_org_id = get_user_organization(auth.uid())))
WITH CHECK (is_owner(auth.uid()) AND (owner_org_id = get_user_organization(auth.uid())));

CREATE POLICY "Owners can create travel agents" ON public.travel_agents FOR INSERT
WITH CHECK ((organization_id IS NOT NULL)
  AND (organization_id = (SELECT users.organization_id FROM users WHERE users.user_id = auth.uid() LIMIT 1))
  AND is_owner(auth.uid()));
CREATE POLICY "Owners can update their travel agents" ON public.travel_agents FOR UPDATE
USING ((organization_id IS NOT NULL)
  AND (organization_id = (SELECT users.organization_id FROM users WHERE users.user_id = auth.uid() LIMIT 1))
  AND is_owner(auth.uid()));
CREATE POLICY "Owners can view their travel agents" ON public.travel_agents FOR SELECT
USING ((organization_id IS NOT NULL)
  AND (organization_id = (SELECT users.organization_id FROM users WHERE users.user_id = auth.uid() LIMIT 1))
  AND is_owner(auth.uid()));

CREATE POLICY ow_insert_tree_carers ON public.tree_carers FOR INSERT
WITH CHECK (is_owner(auth.uid()) AND ((associated_partner_id IS NULL) OR (associated_partner_id = get_user_organization(auth.uid()))));
CREATE POLICY ow_select_tree_carers ON public.tree_carers FOR SELECT
USING (is_owner(auth.uid()) AND ((associated_partner_id IS NULL) OR (associated_partner_id = get_user_organization(auth.uid()))));
CREATE POLICY ow_update_tree_carers ON public.tree_carers FOR UPDATE
USING (is_owner(auth.uid()) AND ((associated_partner_id IS NULL) OR (associated_partner_id = get_user_organization(auth.uid()))));

CREATE POLICY ow_tree_geotags ON public.tree_geotags FOR ALL TO authenticated
USING (is_owner(auth.uid())) WITH CHECK (is_owner(auth.uid()));
CREATE POLICY ow_tree_growth ON public.tree_growth_metrics FOR ALL TO authenticated
USING (is_owner(auth.uid())) WITH CHECK (is_owner(auth.uid()));
CREATE POLICY ow_tree_impact_records ON public.tree_impact_records FOR ALL TO authenticated
USING (is_owner(auth.uid())) WITH CHECK (is_owner(auth.uid()));
CREATE POLICY ow_tree_monitoring_logs ON public.tree_monitoring_logs FOR ALL TO authenticated
USING (is_owner(auth.uid())) WITH CHECK (is_owner(auth.uid()));
CREATE POLICY ow_tree_planting_assignments ON public.tree_planting_assignments FOR ALL TO authenticated
USING (is_owner(auth.uid())) WITH CHECK (is_owner(auth.uid()));

CREATE POLICY ow_tree_status_transitions ON public.tree_status_transitions FOR ALL
USING (is_owner(auth.uid()) AND (tree_id IN (SELECT t.id FROM trees t WHERE t.owner_org_id = get_user_organization(auth.uid()))))
WITH CHECK (is_owner(auth.uid()) AND (tree_id IN (SELECT t.id FROM trees t WHERE t.owner_org_id = get_user_organization(auth.uid()))));

CREATE POLICY ow_tree_survival_records ON public.tree_survival_records FOR ALL TO authenticated
USING (is_owner(auth.uid())) WITH CHECK (is_owner(auth.uid()));
CREATE POLICY ow_tree_survival ON public.tree_survival_tracking FOR ALL TO authenticated
USING (is_owner(auth.uid())) WITH CHECK (is_owner(auth.uid()));

CREATE POLICY "Owners can view allocated trees" ON public.trees FOR SELECT
USING (is_owner(auth.uid()) AND (owner_org_id = get_user_organization(auth.uid())));
CREATE POLICY "Owners can update allocated trees" ON public.trees FOR UPDATE
USING (is_owner(auth.uid()) AND (owner_org_id = get_user_organization(auth.uid())));
CREATE POLICY "Owners with tree_management can view trees" ON public.trees FOR SELECT
USING (owner_has_module_permission(auth.uid(), 'tree_management'::text, 'read'::text));
CREATE POLICY "Owners with tree_orders module can view all trees" ON public.trees FOR SELECT
USING (is_owner(auth.uid()) AND owner_has_module(auth.uid(), 'tree_orders'::text));
CREATE POLICY "Owners with tree_orders module can update all trees" ON public.trees FOR UPDATE
USING (is_owner(auth.uid()) AND owner_has_module(auth.uid(), 'tree_orders'::text));

CREATE POLICY "Owners with travel_agents module can view all trips" ON public.trips FOR SELECT
USING (is_owner(auth.uid()) AND owner_has_module(auth.uid(), 'travel_agents'::text));
CREATE POLICY "Owners with trip_management can view trips" ON public.trips FOR SELECT
USING (owner_has_module_permission(auth.uid(), 'trip_management'::text, 'read'::text));

COMMIT;
