-- Enable RLS on generated_assets if not already enabled
ALTER TABLE generated_assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them properly)
DROP POLICY IF EXISTS "Users can view their own generated assets" ON generated_assets;
DROP POLICY IF EXISTS "Users can insert their own generated assets" ON generated_assets;
DROP POLICY IF EXISTS "Users can update their own generated assets" ON generated_assets;
DROP POLICY IF EXISTS "Users can delete their own generated assets" ON generated_assets;

-- Allow users to view only their own generated assets
CREATE POLICY "Users can view their own generated assets"
ON generated_assets
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own generated assets
CREATE POLICY "Users can insert their own generated assets"
ON generated_assets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own generated assets
CREATE POLICY "Users can update their own generated assets"
ON generated_assets
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own generated assets
CREATE POLICY "Users can delete their own generated assets"
ON generated_assets
FOR DELETE
USING (auth.uid() = user_id);