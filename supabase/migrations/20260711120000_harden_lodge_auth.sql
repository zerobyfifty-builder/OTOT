-- Harden lodge authentication.
--
-- Before: lodges.password_hash held PLAINTEXT and the "Everyone can view active
-- lodges" policy (TO public) let any anon client SELECT it; lodge_sessions had
-- wide-open anon INSERT/SELECT/UPDATE/DELETE. Login compared the password in the
-- browser (src/contexts/LodgeAuthContext.tsx).
--
-- After: credentials live in a locked lodge_credentials table (service-role only),
-- hashed with bcrypt (pgcrypto); the secret columns are removed from the
-- anon-readable lodges table; lodge_sessions is closed to clients; and
-- SECURITY DEFINER helpers let the server-side edge functions verify/set
-- passwords without ever exposing the hash.

-- 1. pgcrypto for bcrypt (crypt / gen_salt), in the conventional extensions schema.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Locked credentials table. RLS enabled with NO policies => only the service
--    role (which bypasses RLS) can read/write it. Browsers cannot touch it.
CREATE TABLE IF NOT EXISTS public.lodge_credentials (
  lodge_id      uuid PRIMARY KEY REFERENCES public.lodges(id) ON DELETE CASCADE,
  username      text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lodge_credentials ENABLE ROW LEVEL SECURITY;

-- 3. Move any existing credentials off lodges, hashing the (currently plaintext)
--    password during the move.
INSERT INTO public.lodge_credentials (lodge_id, username, password_hash)
SELECT id, username, extensions.crypt(password_hash, extensions.gen_salt('bf'))
FROM public.lodges
WHERE username IS NOT NULL AND password_hash IS NOT NULL
ON CONFLICT (lodge_id) DO NOTHING;

-- 4. Remove the secret columns from the anon-readable lodges table. The existing
--    "Everyone can view active lodges" policy is now safe (no secrets remain).
ALTER TABLE public.lodges DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.lodges DROP COLUMN IF EXISTS username;

-- 5. Close the wide-open anon policies on lodge_sessions. RLS stays enabled with
--    no client policies, so only the service role (edge functions) manages sessions.
DROP POLICY IF EXISTS "Anyone can create lodge sessions" ON public.lodge_sessions;
DROP POLICY IF EXISTS "Anyone can view lodge sessions"   ON public.lodge_sessions;
DROP POLICY IF EXISTS "Anyone can update lodge sessions" ON public.lodge_sessions;
DROP POLICY IF EXISTS "Anyone can delete lodge sessions" ON public.lodge_sessions;

-- 6. Server-side credential helpers (called only by the lodge-login /
--    admin-set-lodge-password edge functions via the service role).

-- Returns the lodge_id when username+password match an ACTIVE lodge, else NULL.
-- bcrypt verification happens in the DB; the hash never leaves Postgres.
CREATE OR REPLACE FUNCTION public.verify_lodge_password(_username text, _password text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT c.lodge_id
  FROM public.lodge_credentials c
  JOIN public.lodges l ON l.id = c.lodge_id
  WHERE c.username = _username
    AND l.is_active = true
    AND c.password_hash = extensions.crypt(_password, c.password_hash)
  LIMIT 1
$$;

-- Upserts a bcrypt-hashed credential for a lodge.
CREATE OR REPLACE FUNCTION public.set_lodge_password(_lodge_id uuid, _username text, _password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.lodge_credentials (lodge_id, username, password_hash, updated_at)
  VALUES (_lodge_id, _username, extensions.crypt(_password, extensions.gen_salt('bf')), now())
  ON CONFLICT (lodge_id) DO UPDATE
    SET username      = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        updated_at    = now();
END;
$$;

-- Only the service role may execute these (never anon/authenticated clients).
-- Revoke from anon/authenticated explicitly, not just PUBLIC: Supabase's default
-- privileges grant EXECUTE to those roles directly, which a FROM PUBLIC revoke
-- would leave in place.
REVOKE EXECUTE ON FUNCTION public.verify_lodge_password(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_lodge_password(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.verify_lodge_password(text, text) TO service_role;
GRANT  EXECUTE ON FUNCTION public.set_lodge_password(uuid, text, text) TO service_role;
