-- Ensure public Inspire reads can access related assets and creator profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'generated_assets'
      AND policyname = 'public_read_inspire_assets'
  ) THEN
    EXECUTE $$
      CREATE POLICY "public_read_inspire_assets"
      ON public.generated_assets
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.shared_assets sa
          WHERE sa.asset_id = generated_assets.id
            AND coalesce(sa.is_deleted, false) = false
            AND (
              coalesce(sa.is_inspire_approved, false) = true
              OR coalesce(sa.featured, false) = true
              OR coalesce(sa.staff_pick, false) = true
            )
        )
      );
    $$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'public_read_inspire_profiles'
  ) THEN
    EXECUTE $$
      CREATE POLICY "public_read_inspire_profiles"
      ON public.profiles
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.shared_assets sa
          WHERE sa.user_id = profiles.id
            AND coalesce(sa.is_deleted, false) = false
            AND (
              coalesce(sa.is_inspire_approved, false) = true
              OR coalesce(sa.featured, false) = true
              OR coalesce(sa.staff_pick, false) = true
            )
        )
      );
    $$;
  END IF;
END $$;
