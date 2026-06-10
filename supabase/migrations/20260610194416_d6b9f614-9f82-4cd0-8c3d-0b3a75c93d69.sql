
CREATE TABLE public.planting_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planted_by_name text NOT NULL,
  planted_by_description text,
  site_name text NOT NULL,
  site_description text,
  site_url text,
  photo_url text,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  is_active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.planting_locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planting_locations TO authenticated;
GRANT ALL ON public.planting_locations TO service_role;

ALTER TABLE public.planting_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active planting locations"
  ON public.planting_locations FOR SELECT
  USING (is_active = true OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert planting locations"
  ON public.planting_locations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update planting locations"
  ON public.planting_locations FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete planting locations"
  ON public.planting_locations FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER planting_locations_set_updated_at
  BEFORE UPDATE ON public.planting_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for planting-photos bucket (used for location photos)
CREATE POLICY "Super admins can upload planting location photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'planting-photos'
    AND (storage.foldername(name))[1] = 'planting-locations'
    AND public.is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins can update planting location photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'planting-photos'
    AND (storage.foldername(name))[1] = 'planting-locations'
    AND public.is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins can delete planting location photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'planting-photos'
    AND (storage.foldername(name))[1] = 'planting-locations'
    AND public.is_super_admin(auth.uid())
  );

-- Seed current Mau Forest defaults as the initial active row
INSERT INTO public.planting_locations (
  planted_by_name, planted_by_description, site_name, site_description, site_url, gps_lat, gps_lng, is_active, sort_order
) VALUES (
  'MFC-ICLIP',
  'The Mau Forest Complex Integrated Conservation and Livelihood Improvement Programme, under the Ministry of Environment, Climate Change & Forestry, is a landmark 10-year initiative targeting over 317,000 hectares—one of East Africa''s most ambitious landscape restoration efforts.',
  'Mau Forest Complex',
  'A vital water tower and source of 12 major rivers feeding Lake Victoria, Lake Nakuru, and the Maasai Mara-Serengeti. Your tree is planted here by MFC-ICLIP to restore this degraded landscape and regenerate the forest.',
  'https://mfc-iclip.org/',
  -0.5167,
  35.7500,
  true,
  0
);
