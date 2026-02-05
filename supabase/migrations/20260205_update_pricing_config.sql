-- Migration: Update pricing configuration
-- Remove lovable and replicate pricing, add gemini and openai pricing

-- Step 1: Remove old provider pricing
DELETE FROM public.pricing_config
  WHERE provider IN ('lovable', 'replicate');

-- Step 2: Insert new pricing for OpenAI and Gemini
-- Using ON CONFLICT to safely update if rows exist
INSERT INTO public.pricing_config (action, provider, credits, active) VALUES
  -- Gemini pricing (cost-effective)
  ('analyze', 'gemini', 1, true),
  ('generate', 'gemini', 3, true),
  ('edit', 'gemini', 2, true),
  ('refine', 'gemini', 1, true),
  ('blend', 'gemini', 2, true),
  ('upscale', 'gemini', 2, true),

  -- OpenAI pricing (premium)
  ('generate', 'openai', 7, true),
  ('edit', 'openai', 5, true)
ON CONFLICT (action, provider)
  DO UPDATE SET
    credits = EXCLUDED.credits,
    active = EXCLUDED.active;

-- Step 3: Verify no orphaned lovable/replicate rows remain
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM public.pricing_config
  WHERE provider IN ('lovable', 'replicate');

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Found % orphaned lovable/replicate pricing rows', orphan_count;
  END IF;

  RAISE NOTICE 'Pricing configuration updated successfully';
END $$;
