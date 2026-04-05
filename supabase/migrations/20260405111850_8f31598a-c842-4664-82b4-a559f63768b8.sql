
-- Add mdm_sequestration module to modules table
INSERT INTO modules (name, display_name, description, category, access_type, icon, route, sort_order, is_active)
VALUES (
  'mdm_sequestration',
  'Sequestration Rates',
  'Manage tree species CO₂ sequestration rates for carbon offset calculations',
  'master_data',
  'shared',
  'BarChart3',
  '/stakeholder/mdm-sequestration',
  55,
  true
);

-- Assign mdm_sequestration to all organizations that already have mdm_locations assigned (plantation stakeholders)
INSERT INTO organization_modules (module_id, organization_id, is_active, permissions)
SELECT 
  (SELECT id FROM modules WHERE name = 'mdm_sequestration'),
  om.organization_id,
  true,
  '["read","write","edit"]'::jsonb
FROM organization_modules om
JOIN modules m ON m.id = om.module_id
WHERE m.name = 'mdm_locations'
ON CONFLICT DO NOTHING;
