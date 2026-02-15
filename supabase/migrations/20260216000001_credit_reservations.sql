-- Credit reservations: status, expiry, and profile free_credits default
-- Extend credit_action for reservation flow; add columns to credit_transactions.

-- 1) Extend credit_action enum (reservations use regenerate, effects_commit, usage)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'regenerate' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'credit_action')) THEN
    ALTER TYPE public.credit_action ADD VALUE 'regenerate';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'effects_commit' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'credit_action')) THEN
    ALTER TYPE public.credit_action ADD VALUE 'effects_commit';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'usage' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'credit_action')) THEN
    ALTER TYPE public.credit_action ADD VALUE 'usage';
  END IF;
END $$;

-- 2) Add reservation columns to credit_transactions
ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS committed_at timestamptz;

-- Ensure default for existing rows
UPDATE public.credit_transactions SET status = 'completed' WHERE status IS NULL;

ALTER TABLE public.credit_transactions
  ALTER COLUMN status SET DEFAULT 'completed';

-- 3) Add CHECK constraint for status (only if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'credit_transactions_status_check'
      AND conrelid = 'public.credit_transactions'::regclass
  ) THEN
    ALTER TABLE public.credit_transactions
      ADD CONSTRAINT credit_transactions_status_check
      CHECK (status IN ('pending', 'completed', 'reversed'));
  END IF;
END $$;

-- 4) Partial indexes for pending reservations
CREATE INDEX IF NOT EXISTS idx_credit_txn_pending
  ON public.credit_transactions (user_id, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_credit_txn_expires
  ON public.credit_transactions (expires_at)
  WHERE status = 'pending';

-- 5) Set profiles.free_credits default to 59 (new signups)
ALTER TABLE public.profiles
  ALTER COLUMN free_credits SET DEFAULT 59;

COMMENT ON COLUMN public.credit_transactions.status IS 'pending = reserved, completed = committed, reversed = refunded';
COMMENT ON COLUMN public.credit_transactions.expires_at IS 'Reservation expiry (e.g. 5 min); NULL for completed/reversed';
COMMENT ON COLUMN public.credit_transactions.committed_at IS 'When reservation was committed or reversed';
