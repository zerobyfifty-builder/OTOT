-- Make ram@ramsenthil.com a super_admin
UPDATE public.users 
SET role_id = (SELECT id FROM public.roles WHERE name = 'super_admin')
WHERE email = 'ram@ramsenthil.com';