-- Auto-assign Dashboard (inst_dashboard) to every partner_type, including all newly created ones.

-- 1. Backfill: ensure every existing partner_type has inst_dashboard
INSERT INTO public.partner_type_modules (partner_type_id, module_id, is_active)
SELECT pt.id, m.id, true
FROM public.partner_types pt
CROSS JOIN public.modules m
WHERE m.name = 'inst_dashboard'
  AND NOT EXISTS (
    SELECT 1 FROM public.partner_type_modules ptm
    WHERE ptm.partner_type_id = pt.id AND ptm.module_id = m.id
  );

-- 2. Trigger: auto-assign inst_dashboard whenever a new partner_type is created
CREATE OR REPLACE FUNCTION public.auto_assign_default_partner_modules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dashboard_id uuid;
BEGIN
  SELECT id INTO _dashboard_id FROM public.modules WHERE name = 'inst_dashboard' LIMIT 1;
  IF _dashboard_id IS NOT NULL THEN
    INSERT INTO public.partner_type_modules (partner_type_id, module_id, is_active)
    VALUES (NEW.id, _dashboard_id, true)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_types_default_modules ON public.partner_types;
CREATE TRIGGER trg_partner_types_default_modules
  AFTER INSERT ON public.partner_types
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_default_partner_modules();