-- Fix notifications foreign key constraint issue
-- The constraint might be blocking tourist notifications
-- Drop the constraint if it exists and recreate it properly

-- First, check if there's a foreign key constraint and drop it
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_recipient_id_fkey' 
        AND table_name = 'notifications'
    ) THEN
        ALTER TABLE public.notifications DROP CONSTRAINT notifications_recipient_id_fkey;
    END IF;
END $$;

-- Don't add back the foreign key constraint since recipient_id can be either:
-- 1. user_id (for tourists)
-- 2. organization_id (for lodges/admins)
-- This is by design for our notification system