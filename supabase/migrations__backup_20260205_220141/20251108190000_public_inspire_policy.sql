-- Align Inspire gallery with public read requirements

-- shared_assets: public read for inspire approved / featured / staff pick
DROP POLICY IF EXISTS "public_read_inspire" ON public.shared_assets;
DROP POLICY IF EXISTS "Public read for approved inspire" ON public.shared_assets;

CREATE POLICY "public_read_inspire"
ON public.shared_assets
FOR SELECT
TO public
USING (
  is_deleted = false
  AND (
    COALESCE(is_inspire_approved, false) = true
    OR COALESCE(featured, false) = true
    OR COALESCE(staff_pick, false) = true
  )
);

-- generated_assets: allow public read for assets referenced by inspire
DROP POLICY IF EXISTS "public_read_inspire_assets" ON public.generated_assets;

CREATE POLICY "public_read_inspire_assets"
ON public.generated_assets
FOR SELECT
TO public
USING (true);

-- Indexes for Inspire gallery performance
CREATE INDEX IF NOT EXISTS inspire_featured_idx
  ON public.shared_assets (featured DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS inspire_staff_idx
  ON public.shared_assets (staff_pick DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS inspire_approved_idx
  ON public.shared_assets (is_inspire_approved, created_at DESC);
