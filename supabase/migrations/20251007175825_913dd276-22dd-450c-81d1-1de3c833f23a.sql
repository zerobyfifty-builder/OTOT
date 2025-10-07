-- Create magic_tokens table for passwordless authentication
CREATE TABLE IF NOT EXISTS public.magic_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  pledge_context jsonb,
  expires_at timestamp with time zone NOT NULL,
  consumed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  device_fingerprint text
);

-- Add index for faster lookups
CREATE INDEX idx_magic_tokens_token_hash ON public.magic_tokens(token_hash);
CREATE INDEX idx_magic_tokens_email ON public.magic_tokens(email);
CREATE INDEX idx_magic_tokens_expires_at ON public.magic_tokens(expires_at);

-- Create ephemeral_sessions table for deep link flows
CREATE TABLE IF NOT EXISTS public.ephemeral_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  pledge_context jsonb,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  consumed boolean DEFAULT false
);

CREATE INDEX idx_ephemeral_sessions_token_hash ON public.ephemeral_sessions(token_hash);

-- Add status enum for pledges if not exists
DO $$ BEGIN
  CREATE TYPE pledge_status_type AS ENUM ('pending_email_confirmation', 'confirmed', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update users table to support silent creation and email verification
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_via text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone;

-- Update trees table to support pledge flow statuses
ALTER TABLE public.trees 
  ADD COLUMN IF NOT EXISTS pledge_status pledge_status_type DEFAULT 'confirmed';

-- Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.magic_tokens 
  WHERE expires_at < now() - interval '7 days';
  
  DELETE FROM public.ephemeral_sessions 
  WHERE expires_at < now() - interval '1 day';
END;
$$;

-- Create auth_logs table for monitoring
CREATE TABLE IF NOT EXISTS public.auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  email text,
  success boolean NOT NULL,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_logs_email ON public.auth_logs(email);
CREATE INDEX idx_auth_logs_event_type ON public.auth_logs(event_type);
CREATE INDEX idx_auth_logs_created_at ON public.auth_logs(created_at);

-- Enable RLS on new tables
ALTER TABLE public.magic_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ephemeral_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for magic_tokens (backend only)
CREATE POLICY "Service role can manage magic tokens"
ON public.magic_tokens
FOR ALL
USING (auth.role() = 'service_role');

-- RLS policies for ephemeral_sessions (backend only)
CREATE POLICY "Service role can manage ephemeral sessions"
ON public.ephemeral_sessions
FOR ALL
USING (auth.role() = 'service_role');

-- RLS policies for auth_logs (admins only)
CREATE POLICY "Admins can view auth logs"
ON public.auth_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));