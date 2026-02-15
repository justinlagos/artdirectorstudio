-- Grant admin role and unlimited credits to the admin user
-- This migration grants admin privileges to the first user (typically the project owner)
-- You can modify the WHERE clause to target a specific user by email

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the first user's ID (typically the project creator/owner)
  -- MODIFY THIS QUERY if you want to target a specific user by email:
  -- SELECT id INTO admin_user_id FROM auth.users WHERE email = 'your-admin@email.com' LIMIT 1;

  SELECT id INTO admin_user_id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;

  -- If a user was found, grant admin privileges
  IF admin_user_id IS NOT NULL THEN
    -- Grant generous free credits (999 for testing)
    UPDATE public.profiles
    SET free_credits = 999
    WHERE id = admin_user_id;

    -- Also add top-up balance (999 for testing)
    INSERT INTO public.credits (user_id, balance)
    VALUES (admin_user_id, 999)
    ON CONFLICT (user_id)
    DO UPDATE SET balance = 999;

    -- Grant admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Admin privileges granted to user ID: %', admin_user_id;
  ELSE
    RAISE NOTICE 'No users found - admin privileges not granted';
  END IF;
END $$;

-- Comments
COMMENT ON TABLE public.user_roles IS 'Admin users bypass credit checks and have full platform access';
