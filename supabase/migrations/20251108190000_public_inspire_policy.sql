-- Align Inspire gallery with public read requirements
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shared_assets'
      AND policyname = 'Public read for approved inspire'
  ) THEN
    EXECUTE 'DROP POLICY "Public read for approved inspire" ON public.shared_assets';
  END IF;
END $$;

CREATE POLICY IF NOT EXISTS "public_read_inspire"
ON public.shared_assets
FOR SELECT
USING (
  is_deleted = false
  AND (
    coalesce(is_inspire_approved, false) = true
    OR coalesce(featured, false) = true
    OR coalesce(staff_pick, false) = true
  )
);

CREATE INDEX IF NOT EXISTS inspire_featured_idx ON public.shared_assets (featured DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS inspire_staff_idx ON public.shared_assets (staff_pick DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS inspire_approved_idx ON public.shared_assets (is_inspire_approved, created_at DESC);

