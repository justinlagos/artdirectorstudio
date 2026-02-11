-- Ensure public read access for Inspire-approved content
-- This allows logged-out visitors to see approved, featured, or staff-picked projects

-- Drop existing overlapping policies if they exist to consolidate
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public shared assets are viewable by all" ON public.shared_assets;
  DROP POLICY IF EXISTS "Anyone can view public shared assets" ON public.shared_assets;
  DROP POLICY IF EXISTS "Anyone can view inspire approved assets" ON public.shared_assets;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create single consolidated policy for public Inspire visibility
CREATE POLICY "public_inspire_read"
ON public.shared_assets
FOR SELECT
USING (
  is_deleted = false
  AND (
    is_inspire_approved = true
    OR featured = true
    OR staff_pick = true
  )
);

-- Ensure storage bucket for generated-images is publicly readable
UPDATE storage.buckets
SET public = true
WHERE id = 'generated-images';

-- Ensure profiles table allows public read for usernames/emails (needed for Inspire author display)
DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "profiles_public_read"
ON public.profiles
FOR SELECT
USING (true);

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Inspire public visibility policies configured successfully';
END $$;
