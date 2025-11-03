-- Create function to adjust user credits (admin only)
CREATE OR REPLACE FUNCTION public.adjust_user_credits(
  target_user_id UUID,
  amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the user's credit balance
  UPDATE public.credits
  SET balance = balance + amount
  WHERE user_id = target_user_id;

  -- Log the transaction
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    action,
    description
  ) VALUES (
    target_user_id,
    amount,
    CASE WHEN amount > 0 THEN 'admin_credit' ELSE 'admin_debit' END,
    CASE 
      WHEN amount > 0 THEN 'Credits added by admin'
      ELSE 'Credits deducted by admin'
    END
  );
END;
$$;