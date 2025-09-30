-- Fix RLS policies for lodge_sessions to allow anonymous access
-- Drop existing policies
DROP POLICY IF EXISTS "Lodge sessions are viewable by session owner" ON public.lodge_sessions;
DROP POLICY IF EXISTS "Lodge sessions can be created by anyone" ON public.lodge_sessions;
DROP POLICY IF EXISTS "Lodge sessions can be deleted by session owner" ON public.lodge_sessions;
DROP POLICY IF EXISTS "Lodge sessions can be updated by session owner" ON public.lodge_sessions;

-- Create new policies that work for anonymous (non-authenticated) users
CREATE POLICY "Anyone can create lodge sessions"
ON public.lodge_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can view lodge sessions"
ON public.lodge_sessions
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can update lodge sessions"
ON public.lodge_sessions
FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can delete lodge sessions"
ON public.lodge_sessions
FOR DELETE
TO anon, authenticated
USING (true);