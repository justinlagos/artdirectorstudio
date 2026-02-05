-- Migration: Remove Lovable and Replicate providers
-- Strategy: Convert credit_provider enum to TEXT with CHECK constraint
-- Safe for existing data: lovable → gemini, replicate → gemini, openai → openai

-- Step 1: Add new TEXT column with temporary name
ALTER TABLE public.credit_transactions
  ADD COLUMN provider_type TEXT;

-- Step 2: Migrate existing data
-- lovable was using Gemini under the hood, so map to gemini
-- replicate wasn't actively used, fallback to gemini
-- openai stays as openai
UPDATE public.credit_transactions
  SET provider_type = CASE
    WHEN provider::text = 'lovable' THEN 'gemini'
    WHEN provider::text = 'replicate' THEN 'gemini'
    WHEN provider::text = 'openai' THEN 'openai'
    ELSE 'gemini'  -- Safety fallback
  END;

-- Step 3: Drop old enum column
ALTER TABLE public.credit_transactions
  DROP COLUMN provider;

-- Step 4: Rename new column to provider
ALTER TABLE public.credit_transactions
  RENAME COLUMN provider_type TO provider;

-- Step 5: Make it NOT NULL and add CHECK constraint
ALTER TABLE public.credit_transactions
  ALTER COLUMN provider SET NOT NULL,
  ADD CONSTRAINT credit_transactions_provider_check
    CHECK (provider IN ('openai', 'gemini'));

-- Step 6: Drop old enum type
DROP TYPE IF EXISTS public.credit_provider;

-- Add comment for documentation
COMMENT ON COLUMN public.credit_transactions.provider IS
  'Provider used for the transaction. Valid values: openai, gemini. Migrated from enum on 2026-02-05.';
