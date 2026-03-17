
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS profile_photo_url text;

-- Create profile-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own profile photos
CREATE POLICY "Users can upload own profile photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own profile photos
CREATE POLICY "Users can update own profile photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own profile photos
CREATE POLICY "Users can delete own profile photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to profile photos
CREATE POLICY "Public can view profile photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-photos');
