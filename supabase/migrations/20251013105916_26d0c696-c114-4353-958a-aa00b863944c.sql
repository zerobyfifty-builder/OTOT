-- Fix the lodge user's role and organization
UPDATE users
SET 
  role_id = 'e44c0af6-ee4d-4995-beac-38b117b69d44',
  organization_id = '11111111-1111-1111-1111-111111111111',
  email_verified = true
WHERE user_id = '02176332-8e33-4158-8f57-2df4a10b9782';