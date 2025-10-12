-- Bypass email verification for admin@the1campaign.com
-- This is a one-time manual override for the super admin account
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'admin@the1campaign.com';