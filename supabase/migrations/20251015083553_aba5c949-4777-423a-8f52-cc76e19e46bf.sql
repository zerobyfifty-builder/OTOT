-- Delete all data for user chirchir.marketing@gmail.com (60893904-709b-41a4-a1bf-593e0f3432af)
-- This will clean up all references before the demo

DO $$
DECLARE
  target_user_id uuid := '60893904-709b-41a4-a1bf-593e0f3432af';
BEGIN
  -- Delete notifications related to this user
  DELETE FROM public.notifications 
  WHERE recipient_id = target_user_id 
     OR related_tree_id IN (SELECT id FROM public.trees WHERE user_id = target_user_id);
  
  -- Delete certificates for this user
  DELETE FROM public.certificates WHERE user_id = target_user_id;
  
  -- Delete trees planted by this user
  DELETE FROM public.trees WHERE user_id = target_user_id;
  
  -- Delete trips for this user
  DELETE FROM public.trips WHERE user_id = target_user_id;
  
  -- Delete user roles
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  
  -- Delete from users table
  DELETE FROM public.users WHERE user_id = target_user_id;
  
  -- Delete from auth.users (this should cascade but we'll be explicit)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RAISE NOTICE 'Successfully deleted user % and all associated data', target_user_id;
END $$;