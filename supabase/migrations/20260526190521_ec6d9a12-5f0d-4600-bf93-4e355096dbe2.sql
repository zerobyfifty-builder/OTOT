ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'owner';
ALTER TABLE public.modules DROP CONSTRAINT IF EXISTS modules_audience_check;
ALTER TABLE public.modules ADD CONSTRAINT modules_audience_check CHECK (audience IN ('owner','partner','both'));
UPDATE public.modules SET audience = 'owner' WHERE audience IS NULL;