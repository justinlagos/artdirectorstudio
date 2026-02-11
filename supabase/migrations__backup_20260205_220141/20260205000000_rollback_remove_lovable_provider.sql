-- ROLLBACK Migration: Restore credit_provider enum
-- WARNING: This rollback will map all 'gemini' back to 'lovable'
-- Only use if you need to revert the provider removal

-- Step 1: Recreate the old enum type
CREATE TYPE public.credit_provider AS ENUM ('lovable', 'openai', 'replicate');

-- Step 2: Add temporary column with enum type
ALTER TABLE public.credit_transactions
  ADD COLUMN provider_enum public.credit_provider;

-- Step 3: Map text values back to enum (gemini → lovable for rollback)
UPDATE public.credit_transactions
  SET provider_enum = CASE
    WHEN provider = 'gemini' THEN 'lovable'::public.credit_provider
    WHEN provider = 'openai' THEN 'openai'::public.credit_provider
    ELSE 'lovable'::public.credit_provider
  END;

-- Step 4: Drop text column
ALTER TABLE public.credit_transactions
  DROP COLUMN provider;

-- Step 5: Rename enum column to provider
ALTER TABLE public.credit_transactions
  RENAME COLUMN provider_enum TO provider;

-- Step 6: Make it NOT NULL
ALTER TABLE public.credit_transactions
  ALTER COLUMN provider SET NOT NULL;

COMMENT ON COLUMN public.credit_transactions.provider IS
  'Provider used for the transaction (rolled back to enum).';
