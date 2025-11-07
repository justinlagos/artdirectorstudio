-- Add public read access policy for images in generated-images bucket
-- This allows shared assets to be viewed publicly
CREATE POLICY "Public images are viewable by everyone"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'generated-images');