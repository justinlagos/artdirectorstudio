-- Add request_id column for better idempotency tracking (additive, safe)
ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS request_id TEXT;

-- Add index for fast idempotency lookups
CREATE INDEX IF NOT EXISTS idx_credit_transactions_request_id 
ON credit_transactions(request_id) 
WHERE request_id IS NOT NULL;

-- Add payments table for Stripe webhook tracking (new table, won't conflict)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent TEXT UNIQUE,
  stripe_event_id TEXT UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  package_name TEXT,
  credits_purchased INT NOT NULL,
  amount_cents INT NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT CHECK (status IN ('pending','completed','failed','refunded')) NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view their own payments"
ON payments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add index for user lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_event ON payments(stripe_event_id);