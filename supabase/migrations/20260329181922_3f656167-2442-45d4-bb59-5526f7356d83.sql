
ALTER TABLE public.tree_carers
  ADD COLUMN IF NOT EXISTS id_number varchar(50),
  ADD COLUMN IF NOT EXISTS planter_type text DEFAULT 'Community Farmer',
  ADD COLUMN IF NOT EXISTS phone varchar(30),
  ADD COLUMN IF NOT EXISTS email varchar(150),
  ADD COLUMN IF NOT EXISTS cbo_nursery_id uuid REFERENCES public.nurseries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_beats uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sub_county varchar(100),
  ADD COLUMN IF NOT EXISTS date_registered date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE UNIQUE INDEX IF NOT EXISTS tree_carers_id_number_unique ON public.tree_carers(id_number) WHERE id_number IS NOT NULL AND id_number != '';
