
-- Create new Overview (Org) module for institutional partners
INSERT INTO public.modules (name, display_name, category, audience, access_type, route, sort_order, is_active, description)
VALUES (
  'inst_overview',
  'Overview',
  'reporting',
  'partner',
  'scoped',
  '/institutional/overview',
  99,
  true,
  'Aggregated analytics from this organization''s allocated modules (gated to own data).'
)
ON CONFLICT DO NOTHING;

-- Auto-allocate Overview module to all existing partner sub-categories (government + business)
INSERT INTO public.partner_type_modules (partner_type_id, module_id, is_active, permissions)
SELECT pt.id, m.id, true, '["read"]'::jsonb
FROM public.partner_types pt
CROSS JOIN public.modules m
WHERE m.name = 'inst_overview'
  AND pt.is_active = true
  AND pt.category IN ('government','business')
  AND NOT EXISTS (
    SELECT 1 FROM public.partner_type_modules ptm
    WHERE ptm.partner_type_id = pt.id AND ptm.module_id = m.id
  );
