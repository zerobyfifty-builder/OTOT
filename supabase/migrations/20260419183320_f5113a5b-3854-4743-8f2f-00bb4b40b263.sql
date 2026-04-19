-- Engagement activities audit log
CREATE TABLE public.engagement_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id text NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('certificate_viewed','update_sent','report_downloaded')),
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid,
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_engagement_activities_contribution_id ON public.engagement_activities(contribution_id);
CREATE INDEX idx_engagement_activities_created_at ON public.engagement_activities(created_at DESC);

ALTER TABLE public.engagement_activities ENABLE ROW LEVEL SECURITY;

-- Read: stakeholders, admins, super admins
CREATE POLICY "Stakeholders and admins can view engagement activities"
ON public.engagement_activities
FOR SELECT
TO authenticated
USING (
  public.is_stakeholder(auth.uid())
  OR public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Insert: any authenticated user recording their own action
CREATE POLICY "Authenticated users can insert their own engagement activities"
ON public.engagement_activities
FOR INSERT
TO authenticated
WITH CHECK (
  actor_user_id IS NULL OR actor_user_id = auth.uid()
);