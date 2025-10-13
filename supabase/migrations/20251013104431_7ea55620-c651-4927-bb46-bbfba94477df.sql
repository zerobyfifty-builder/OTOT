-- Create business_partner role if it doesn't exist (using 'business' category)
INSERT INTO public.roles (name, display_name, description, role_category)
VALUES ('business_partner', 'Business Partner', 'Lodge and business partners', 'business')
ON CONFLICT (name) DO NOTHING;

-- Create a partner type for lodges if it doesn't exist
INSERT INTO public.partner_types (name, category, description, requires_api, transaction_enabled)
VALUES ('Lodge', 'business', 'Safari lodges and accommodation partners', false, true)
ON CONFLICT DO NOTHING;

-- Create test lodge organization
INSERT INTO public.organizations (
  id,
  name,
  legal_name,
  category,
  contact_email,
  contact_phone,
  contact_person,
  partner_type_id,
  is_active,
  verified
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Test Safari Lodge',
  'Test Safari Lodge Ltd',
  'business',
  'lodge@the1campaign.com',
  '+254 700 000 000',
  'Lodge Manager',
  (SELECT id FROM public.partner_types WHERE name = 'Lodge' LIMIT 1),
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  contact_email = EXCLUDED.contact_email;

-- Create a corresponding lodge entry in the lodges table
INSERT INTO public.lodges (
  id,
  name,
  location,
  contact_email,
  contact_phone,
  is_active,
  latitude,
  longitude
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Test Safari Lodge',
  'Nairobi, Kenya',
  'lodge@the1campaign.com',
  '+254 700 000 000',
  true,
  -1.2921,
  36.8219
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  contact_email = EXCLUDED.contact_email;