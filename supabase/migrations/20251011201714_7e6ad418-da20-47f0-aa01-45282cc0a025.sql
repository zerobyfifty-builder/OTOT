-- Insert ramsusb22@gmail.com into users table with super_admin role.
-- Guarded: only runs when the referenced auth user exists (i.e. production).
-- On a fresh/local database this is a no-op so the schema still applies cleanly.
INSERT INTO public.users (user_id, email, role_id, created_at, updated_at)
SELECT
  'df904c8f-aee1-4ac9-87ee-938172101a92'::uuid,
  'ramsusb22@gmail.com',
  (SELECT id FROM public.roles WHERE name = 'super_admin'),
  now(),
  now()
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE id = 'df904c8f-aee1-4ac9-87ee-938172101a92'::uuid
)
ON CONFLICT (user_id) DO UPDATE
SET role_id = (SELECT id FROM public.roles WHERE name = 'super_admin');