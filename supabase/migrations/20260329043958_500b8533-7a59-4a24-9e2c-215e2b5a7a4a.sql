-- Forest Location Hierarchy tables for MDM

-- Counties
CREATE TABLE IF NOT EXISTS mdm_location_counties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sub-counties
CREATE TABLE IF NOT EXISTS mdm_location_subcounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES mdm_location_counties(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Blocks (MFC Blocks)
CREATE TABLE IF NOT EXISTS mdm_location_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcounty_id UUID NOT NULL REFERENCES mdm_location_subcounties(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(30),
  total_area_ha DECIMAL(10,2),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Forest Stations
CREATE TABLE IF NOT EXISTS mdm_location_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES mdm_location_blocks(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(30),
  station_officer_name VARCHAR(150),
  station_officer_phone VARCHAR(30),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Beats (lowest level)
CREATE TABLE IF NOT EXISTS mdm_location_beats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES mdm_location_stations(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  beat_code VARCHAR(50) NOT NULL UNIQUE,
  area_ha DECIMAL(10,2),
  centroid_latitude DECIMAL(10,8),
  centroid_longitude DECIMAL(11,8),
  target_trees INTEGER DEFAULT 0,
  trees_planted INTEGER DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- MDM Audit Log (shared across all MDM modules)
CREATE TABLE IF NOT EXISTS mdm_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  changed_by_user_id UUID,
  changed_at TIMESTAMPTZ DEFAULT now(),
  old_values JSONB,
  new_values JSONB
);

-- RLS policies
ALTER TABLE mdm_location_counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE mdm_location_subcounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE mdm_location_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mdm_location_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mdm_location_beats ENABLE ROW LEVEL SECURITY;
ALTER TABLE mdm_audit_log ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read location data
CREATE POLICY "auth_read_counties" ON mdm_location_counties FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_subcounties" ON mdm_location_subcounties FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_blocks" ON mdm_location_blocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_stations" ON mdm_location_stations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_beats" ON mdm_location_beats FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_audit" ON mdm_audit_log FOR SELECT TO authenticated USING (true);

-- Super admins can manage all
CREATE POLICY "sa_counties" ON mdm_location_counties FOR ALL TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "sa_subcounties" ON mdm_location_subcounties FOR ALL TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "sa_blocks" ON mdm_location_blocks FOR ALL TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "sa_stations" ON mdm_location_stations FOR ALL TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "sa_beats" ON mdm_location_beats FOR ALL TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "sa_audit" ON mdm_audit_log FOR ALL TO authenticated USING (is_super_admin(auth.uid()));

-- Stakeholders with mdm_locations module can manage
CREATE POLICY "sh_counties" ON mdm_location_counties FOR ALL TO authenticated
  USING (stakeholder_has_module(auth.uid(), 'mdm_locations'))
  WITH CHECK (stakeholder_has_module(auth.uid(), 'mdm_locations'));

CREATE POLICY "sh_subcounties" ON mdm_location_subcounties FOR ALL TO authenticated
  USING (stakeholder_has_module(auth.uid(), 'mdm_locations'))
  WITH CHECK (stakeholder_has_module(auth.uid(), 'mdm_locations'));

CREATE POLICY "sh_blocks" ON mdm_location_blocks FOR ALL TO authenticated
  USING (stakeholder_has_module(auth.uid(), 'mdm_locations'))
  WITH CHECK (stakeholder_has_module(auth.uid(), 'mdm_locations'));

CREATE POLICY "sh_stations" ON mdm_location_stations FOR ALL TO authenticated
  USING (stakeholder_has_module(auth.uid(), 'mdm_locations'))
  WITH CHECK (stakeholder_has_module(auth.uid(), 'mdm_locations'));

CREATE POLICY "sh_beats" ON mdm_location_beats FOR ALL TO authenticated
  USING (stakeholder_has_module(auth.uid(), 'mdm_locations'))
  WITH CHECK (stakeholder_has_module(auth.uid(), 'mdm_locations'));

-- Audit log insert for any authenticated user
CREATE POLICY "auth_insert_audit" ON mdm_audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION mdm_update_timestamp() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_counties_updated BEFORE UPDATE ON mdm_location_counties FOR EACH ROW EXECUTE FUNCTION mdm_update_timestamp();
CREATE TRIGGER trg_subcounties_updated BEFORE UPDATE ON mdm_location_subcounties FOR EACH ROW EXECUTE FUNCTION mdm_update_timestamp();
CREATE TRIGGER trg_blocks_updated BEFORE UPDATE ON mdm_location_blocks FOR EACH ROW EXECUTE FUNCTION mdm_update_timestamp();
CREATE TRIGGER trg_stations_updated BEFORE UPDATE ON mdm_location_stations FOR EACH ROW EXECUTE FUNCTION mdm_update_timestamp();
CREATE TRIGGER trg_beats_updated BEFORE UPDATE ON mdm_location_beats FOR EACH ROW EXECUTE FUNCTION mdm_update_timestamp();