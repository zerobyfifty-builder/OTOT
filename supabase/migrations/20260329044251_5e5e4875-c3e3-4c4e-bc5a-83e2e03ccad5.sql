-- Drop the check constraint on category, then re-add with master_data included
ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_category_check;
ALTER TABLE modules ADD CONSTRAINT modules_category_check CHECK (category IN ('reporting', 'operations', 'oversight', 'financial', 'master_data'));

-- Register MDM modules
INSERT INTO modules (name, display_name, description, category, access_type, sort_order, is_active, route, icon)
VALUES
  ('mdm_locations', 'Forest Locations', 'Hierarchical registry of all MFC-ICLIP forest planting locations', 'master_data', 'scoped', 60, true, '/stakeholder/locations', 'MapPin'),
  ('mdm_nurseries', 'Nurseries & CBOs', 'Registry of all nurseries and CBOs that supply seedlings', 'master_data', 'scoped', 61, true, '/stakeholder/mdm-nurseries', 'Sprout'),
  ('mdm_species', 'Species & Seedlings', 'Master catalogue of all tree species and seedling types', 'master_data', 'scoped', 62, true, '/stakeholder/mdm-species', 'Leaf'),
  ('mdm_planters', 'Planters Registry', 'Registry of all individuals authorised to log planting events', 'master_data', 'scoped', 63, true, '/stakeholder/mdm-planters', 'Users')
ON CONFLICT DO NOTHING;