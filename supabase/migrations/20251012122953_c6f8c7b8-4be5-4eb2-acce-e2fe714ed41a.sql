-- Fix the KTB user's auth record with NULL aud field
-- The aud field is required by Supabase Auth and must not be NULL

UPDATE auth.users
SET 
  aud = 'authenticated',
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_sent_at = COALESCE(confirmation_sent_at, now()),
  updated_at = now()
WHERE id = '015f23de-cc90-4cc3-83dd-af4b65504313'
  AND aud IS NULL;

-- Also ensure the user is properly confirmed
UPDATE public.users
SET 
  email_verified = true,
  updated_at = now()
WHERE user_id = '015f23de-cc90-4cc3-83dd-af4b65504313';