-- Ensure public Inspire reads can access related assets and creator profiles

-- generated_assets: public read (needed for shared_assets -> generated_assets links)
DROP POLICY IF EXISTS "public_read_inspire_assets" ON public.generated_assets;

CREATE POLICY "public_read_inspire_assets"
ON public.generated_assets
FOR SELECT
TO public
USING (true);

-- designer_profiles: only apply if the table exists (avoids failing earlier in migration chain)
DO $$
BEGIN
  IF to_regclass('public.designer_profiles') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "public_read_designer_profiles" ON public.designer_profiles';
    EXECUTE 'CREATE POLICY "public_read_designer_profiles" ON public.designer_profiles FOR SELECT TO public USING (true)';
  END IF;
END $$;
