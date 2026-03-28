
-- Add contribution_id column to trees table for direct linkage
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS contribution_id text;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_trees_contribution_id ON public.trees(contribution_id);
