INSERT INTO public.modules (name, display_name, description, category, access_type, route, icon, sort_order, is_active)
VALUES (
  'impact_insights',
  'Impact Insights',
  'Unified, story-driven dashboard aggregating live carbon, ecosystem and community impact data across all the organisation''s contributions.',
  'reporting',
  'shared',
  '/stakeholder/impact-insights',
  'Sparkles',
  55,
  true
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  route = EXCLUDED.route,
  icon = EXCLUDED.icon,
  is_active = true;