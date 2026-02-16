-- Add idempotency_key column to credit_transactions for race condition prevention

ALTER TABLE public.credit_transactions 
ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_credit_txn_idempotency 
ON public.credit_transactions (idempotency_key) 
WHERE idempotency_key IS NOT NULL;
