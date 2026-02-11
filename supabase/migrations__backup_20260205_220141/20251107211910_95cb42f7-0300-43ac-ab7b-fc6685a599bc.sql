-- Fix admin credit adjustment system

-- Step 1: Make action and provider columns nullable in credit_transactions
ALTER TABLE public.credit_transactions 
ALTER COLUMN action DROP NOT NULL,
ALTER COLUMN provider DROP NOT NULL;

-- Step 2: Drop all existing versions of adjust_user_credits function
DROP FUNCTION IF EXISTS public.adjust_user_credits(uuid, integer);
DROP FUNCTION IF EXISTS public.adjust_user_credits(uuid, integer, text);

-- Step 3: Create the correct adjust_user_credits function for admin credit management
CREATE OR REPLACE FUNCTION public.adjust_user_credits(
  target_user_id UUID,
  amount INTEGER,
  description_text TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Update the user's credit balance
  UPDATE public.credits
  SET balance = balance + amount,
      updated_at = NOW()
  WHERE user_id = target_user_id;

  -- If no record exists, create one (safety check)
  IF NOT FOUND THEN
    INSERT INTO public.credits (user_id, balance, updated_at)
    VALUES (target_user_id, GREATEST(amount, 0), NOW());
  END IF;

  -- Log the transaction with NULL action/provider for admin adjustments
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    action,
    provider,
    description,
    notes,
    timestamp
  ) VALUES (
    target_user_id,
    amount,
    NULL,  -- NULL for admin adjustments
    NULL,  -- NULL for admin adjustments
    COALESCE(description_text, 
      CASE 
        WHEN amount > 0 THEN 'Admin credit adjustment (added)'
        ELSE 'Admin credit adjustment (deducted)'
      END
    ),
    'Manual adjustment by administrator',
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 4: Grant execute permission to authenticated users (admins will use this)
GRANT EXECUTE ON FUNCTION public.adjust_user_credits TO authenticated;

-- Step 5: Add helpful comment
COMMENT ON FUNCTION public.adjust_user_credits IS 'Allows administrators to manually adjust user credit balances. Amount can be positive (add credits) or negative (deduct credits). Action and provider are set to NULL for admin adjustments.';