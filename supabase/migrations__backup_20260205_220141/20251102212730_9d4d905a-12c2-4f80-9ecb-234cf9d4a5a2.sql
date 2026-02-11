-- Allow anyone to view basic profile info for shared assets
CREATE POLICY "Anyone can view profiles for public shared assets"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shared_assets
    WHERE shared_assets.user_id = profiles.id
    AND shared_assets.is_public = true
  )
);