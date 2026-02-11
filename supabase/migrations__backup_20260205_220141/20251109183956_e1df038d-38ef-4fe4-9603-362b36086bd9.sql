-- Allow reading generated assets that are part of public shared assets
CREATE POLICY "public_shared_assets_read"
ON public.generated_assets
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.shared_assets
    WHERE shared_assets.asset_id = generated_assets.id
      AND shared_assets.is_deleted = false
      AND (
        shared_assets.is_inspire_approved = true
        OR shared_assets.featured = true
        OR shared_assets.staff_pick = true
      )
  )
);