
CREATE OR REPLACE FUNCTION public.update_tree_sequestration_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_update_tree_sequestration_rates_updated_at
BEFORE UPDATE ON public.tree_sequestration_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_tree_sequestration_rates_updated_at();
