-- Allow authenticated users to upload, update, and delete planter photos in profile-photos bucket
CREATE POLICY "Authenticated users can upload planter photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-photos');

CREATE POLICY "Authenticated users can update planter photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-photos');

CREATE POLICY "Authenticated users can delete planter photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-photos');

CREATE POLICY "Anyone can view planter photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');