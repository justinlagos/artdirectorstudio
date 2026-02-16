-- Admin setup for mrjustinukaegbu@gmail.com
DO $$
DECLARE
  admin_user_id uuid;
  admin_email text := 'mrjustinukaegbu@gmail.com';
  user_count integer;
BEGIN
  -- Check if user exists
  SELECT COUNT(*) INTO user_count FROM auth.users WHERE email = admin_email;
  
  IF user_count = 0 THEN
    RAISE NOTICE 'User not found: mrjustinukaegbu@gmail.com. Please ensure the user has signed up first.';
  ELSE
    -- Get user ID
    SELECT id INTO admin_user_id FROM auth.users WHERE email = admin_email LIMIT 1;
    
    -- Grant free credits
    UPDATE public.profiles
    SET free_credits = 999
    WHERE id = admin_user_id;

    -- Add top-up balance
    INSERT INTO public.credits (user_id, balance)
    VALUES (admin_user_id, 999)
    ON CONFLICT (user_id)
    DO UPDATE SET balance = 999;

    -- Grant admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Admin privileges granted to mrjustinukaegbu@gmail.com';
  END IF;
END $$;

-- Clean up expired reservations
DELETE FROM public.credit_transactions
WHERE status = 'pending'
AND expires_at IS NOT NULL
AND expires_at < CURRENT_TIMESTAMP;
