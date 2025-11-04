-- Add status field to track pending/completed/refunded transactions
ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS status TEXT 
CHECK (status IN ('pending', 'completed', 'refunded')) 
DEFAULT 'completed';

-- Add index for pending transaction lookups
CREATE INDEX IF NOT EXISTS idx_credit_transactions_status 
ON credit_transactions(status, user_id) 
WHERE status = 'pending';

-- Add completed_at timestamp
ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;