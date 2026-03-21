INSERT INTO public.modules (name, display_name, description, category, access_type, sort_order, is_active)
VALUES ('financial_management', 'Financial Management', 'Contribution tracking and payment lifecycle management', 'financial', 'shared', 60, true)
ON CONFLICT DO NOTHING;