-- Fix Issue 11: Storage Bucket Cross-User Access
-- Replace the public bucket policy with user-scoped access

-- Drop the insecure public read policy
DROP POLICY IF EXISTS "Public images are viewable by everyone" ON storage.objects;

-- Create user-scoped policy: users can only access their own images
-- Images are stored in folders named by user_id
CREATE POLICY "Users can view own generated images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'generated-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to own generated images folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'generated-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to update/delete their own images
CREATE POLICY "Users can update own generated images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'generated-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'generated-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own images
CREATE POLICY "Users can delete own generated images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'generated-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
