-- 20260205220201_update_pricing_config.sql
-- Safe pricing config migration (works even if pricing_config doesn't exist yet)

BEGIN;

-- 1) Ensure pricing_config table exists
CREATE TABLE IF NOT EXISTS public.pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  provider text NOT NULL,
  credits integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  UNIQUE(action, provider)
);

-- 2) Ensure RLS is enabled (idempotent)
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- 3) Ensure a public read policy exists (Postgres does not support "CREATE POLICY IF NOT EXISTS")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pricing_config'
      AND policyname = 'Anyone can view pricing config'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view pricing config" ON public.pricing_config FOR SELECT USING (active = true)';
  END IF;
END $$;

-- 4) Remove old provider pricing (idempotent)
DELETE FROM public.pricing_config
WHERE provider IN ('lovable', 'replicate');

-- 5) Upsert the new pricing (Gemini + OpenAI)
INSERT INTO public.pricing_config (action, provider, credits, active)
VALUES
  ('analyze',  'gemini', 1, true),
  ('generate', 'gemini', 3, true),
  ('refine',   'gemini', 1, true),
  ('blend',    'gemini', 2, true),
  ('upscale',  'gemini', 2, true),
  ('generate', 'openai', 7, true)
ON CONFLICT (action, provider)
DO UPDATE SET credits = EXCLUDED.credits, active = EXCLUDED.active;

COMMIT;
