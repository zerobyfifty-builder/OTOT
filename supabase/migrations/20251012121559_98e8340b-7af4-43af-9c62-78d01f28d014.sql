-- Ensure KTB user is properly set up for login
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at = NOW()
WHERE email = 'ktb@the1campaign.com'
  AND email_confirmed_at IS NULL;

-- Update public.users record
UPDATE public.users
SET 
  email_verified = true,
  updated_at = NOW()
WHERE email = 'ktb@the1campaign.com';