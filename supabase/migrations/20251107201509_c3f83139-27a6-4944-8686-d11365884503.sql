-- Add is_inspire_approved flag to shared_assets
ALTER TABLE public.shared_assets
ADD COLUMN IF NOT EXISTS is_inspire_approved boolean DEFAULT false;

-- Add is_deleted flag for soft deletes
ALTER TABLE public.shared_assets
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Add index for better query performance on Inspire page
CREATE INDEX IF NOT EXISTS idx_shared_assets_inspire 
ON public.shared_assets(is_inspire_approved, is_deleted, created_at DESC)
WHERE is_inspire_approved = true AND is_deleted = false;

-- Update RLS policies to allow public viewing of inspire-approved content
DROP POLICY IF EXISTS "Anyone can view inspire approved assets" ON public.shared_assets;
CREATE POLICY "Anyone can view inspire approved assets"
ON public.shared_assets
FOR SELECT
USING (is_inspire_approved = true AND is_deleted = false);