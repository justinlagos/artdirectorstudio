-- Allow public viewing of Inspire content that is approved, featured, or a staff pick
DROP POLICY IF EXISTS "Anyone can view inspire approved assets" ON public.shared_assets;

CREATE POLICY "Public read for approved inspire"
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
