-- Add password_hash to lodges table for authentication
ALTER TABLE public.lodges
ADD COLUMN password_hash TEXT;

-- Add username field for lodge login
ALTER TABLE public.lodges
ADD COLUMN username TEXT UNIQUE;

-- Create storage bucket for lodge photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lodge-photos',
  'lodge-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Storage policies for lodge photos
CREATE POLICY "Anyone can view lodge photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'lodge-photos');

CREATE POLICY "Authenticated users can upload lodge photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lodge-photos');

CREATE POLICY "Authenticated users can update their lodge photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'lodge-photos');

-- Create storage bucket for reimbursement documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reimbursement-docs',
  'reimbursement-docs',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
);

-- Storage policies for reimbursement documents (admin only view)
CREATE POLICY "Admins can view reimbursement documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'reimbursement-docs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can upload reimbursement documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reimbursement-docs');

-- Add document_urls to reimbursements table
ALTER TABLE public.reimbursements
ADD COLUMN document_urls JSONB DEFAULT '[]'::jsonb;

-- Add growth_notes to trees table for lodge updates
ALTER TABLE public.trees
ADD COLUMN growth_notes TEXT;

-- Create lodge_sessions table for managing lodge authentication
CREATE TABLE public.lodge_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lodge_id UUID REFERENCES public.lodges(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on lodge_sessions
ALTER TABLE public.lodge_sessions ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is associated with a specific lodge
CREATE OR REPLACE FUNCTION public.is_lodge_session_valid(_session_token TEXT, _lodge_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lodge_sessions
    WHERE session_token = _session_token
      AND lodge_id = _lodge_id
      AND expires_at > now()
  )
$$;

-- RLS policies for lodge_sessions
CREATE POLICY "Lodge sessions are viewable by session owner"
ON public.lodge_sessions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Lodge sessions can be created by anyone"
ON public.lodge_sessions
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Lodge sessions can be updated by session owner"
ON public.lodge_sessions
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Lodge sessions can be deleted by session owner"
ON public.lodge_sessions
FOR DELETE
TO authenticated
USING (true);