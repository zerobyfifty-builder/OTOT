
-- Table to store status transition metadata/captured data
CREATE TABLE public.tree_status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  contribution_id TEXT,
  from_status TEXT,
  to_status TEXT NOT NULL,
  transition_data JSONB NOT NULL DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_tree_status_transitions_tree_id ON public.tree_status_transitions(tree_id);
CREATE INDEX idx_tree_status_transitions_to_status ON public.tree_status_transitions(to_status);

-- Enable RLS
ALTER TABLE public.tree_status_transitions ENABLE ROW LEVEL SECURITY;

-- Stakeholders can manage transitions for their org's trees
CREATE POLICY "sh_tree_status_transitions" ON public.tree_status_transitions
FOR ALL TO authenticated
USING (
  is_stakeholder(auth.uid()) AND (
    tree_id IN (
      SELECT t.id FROM public.trees t
      WHERE t.stakeholder_org_id = get_user_organization(auth.uid())
    )
  )
)
WITH CHECK (
  is_stakeholder(auth.uid()) AND (
    tree_id IN (
      SELECT t.id FROM public.trees t
      WHERE t.stakeholder_org_id = get_user_organization(auth.uid())
    )
  )
);

-- Super admins full access
CREATE POLICY "sa_tree_status_transitions" ON public.tree_status_transitions
FOR ALL TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Create storage bucket for planting operation photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('planting-photos', 'planting-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for planting photos
CREATE POLICY "Authenticated users can upload planting photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'planting-photos');

CREATE POLICY "Anyone can view planting photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'planting-photos');

CREATE POLICY "Authenticated users can delete their planting photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'planting-photos');
