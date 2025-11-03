-- Add missing description column to credit_transactions
ALTER TABLE public.credit_transactions 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update the adjust_user_credits function to use description properly
CREATE OR REPLACE FUNCTION public.adjust_user_credits(target_user_id uuid, amount integer, description_text text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update the user's credit balance
  UPDATE public.credits
  SET balance = balance + amount
  WHERE user_id = target_user_id;

  -- Log the transaction with description
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    action,
    description
  ) VALUES (
    target_user_id,
    amount,
    CASE WHEN amount > 0 THEN 'admin_credit' ELSE 'admin_debit' END,
    COALESCE(description_text, CASE 
      WHEN amount > 0 THEN 'Credits added by admin'
      ELSE 'Credits deducted by admin'
    END)
  );
END;
$function$;