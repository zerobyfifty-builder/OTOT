-- Add archive columns to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Create index for archived column for better query performance
CREATE INDEX IF NOT EXISTS idx_organizations_archived ON public.organizations(archived);

-- Add comment to explain the difference
COMMENT ON COLUMN public.organizations.archived IS 'Permanent archive flag - archived partners are hidden from all lists';
COMMENT ON COLUMN public.organizations.is_active IS 'Temporary deactivation flag - inactive partners can be reactivated';