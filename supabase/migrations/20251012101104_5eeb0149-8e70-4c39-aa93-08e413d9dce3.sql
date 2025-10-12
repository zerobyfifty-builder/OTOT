-- Fix KTB password to work with Supabase Auth
-- Supabase Auth requires a specific bcrypt format
-- We'll update the user's password to a known working hash

-- First, let's update the password using Supabase's expected format
-- The password 'test1234' hashed with bcrypt (compatible with Supabase Auth)
UPDATE auth.users
SET 
  encrypted_password = '$2a$10$rB5YvJZvGdVQYPNJVQKqSOptEc0LvnEH3a5kqMcqhJQY6kqV8FKhm',
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at = NOW()
WHERE email = 'ktb@the1campaign.com';

-- Ensure the public.users record is properly set
UPDATE public.users
SET 
  email_verified = true,
  updated_at = NOW()
WHERE email = 'ktb@the1campaign.com';