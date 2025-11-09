-- Ensure Inspire gallery is publicly readable for approved or highlighted assets
ALTER TABLE public.shared_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read for Inspire" ON public.shared_assets;
DROP POLICY IF EXISTS "public_read_inspire" ON public.shared_assets;
DROP POLICY IF EXISTS "Public read for approved inspire" ON public.shared_assets;
DROP POLICY IF EXISTS "Anyone can view inspire approved assets" ON public.shared_assets;
DROP POLICY IF EXISTS "Public shared assets are viewable by all" ON public.shared_assets;

CREATE POLICY "Public read for Inspire"
ON public.shared_assets
FOR SELECT
TO anon, authenticated
USING (
  coalesce(is_deleted, false) = false
  AND (
    coalesce(is_inspire_approved, false) = true
    OR coalesce(featured, false) = true
    OR coalesce(staff_pick, false) = true
  )
);
