-- =====================================================
-- CREDIT SYSTEM FIX - COMPREHENSIVE MIGRATION SCRIPT
-- =====================================================
-- This script applies all credit system fixes and can be run safely multiple times
-- Run this in your Supabase SQL Editor or via: supabase db push

BEGIN;

-- =====================================================
-- STEP 1: Create app_role enum and user_roles table
-- =====================================================

-- Create app_role enum type (skip if exists)
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;

-- Create RLS policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update roles"
  ON public.user_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Grant permissions
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- =====================================================
-- STEP 2: Create handle_new_user trigger
-- =====================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create profile with 59 free credits
  INSERT INTO public.profiles (id, free_credits)
  VALUES (NEW.id, 59)
  ON CONFLICT (id) DO NOTHING;

  -- Initialize credits balance
  INSERT INTO public.credits (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 3: Fix existing users
-- =====================================================

-- Update profiles table default
ALTER TABLE public.profiles
ALTER COLUMN free_credits SET DEFAULT 59;

-- Grant 59 free credits to existing users who have 0
UPDATE public.profiles
SET free_credits = 59
WHERE free_credits = 0;

-- Ensure all existing users have a credits balance record
INSERT INTO public.credits (user_id, balance)
SELECT id, 0
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.credits WHERE credits.user_id = auth.users.id
);

-- Ensure all existing users have a user role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::app_role
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.users.id
);

-- =====================================================
-- STEP 4: Grant admin privileges to first user
-- =====================================================

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

-- =====================================================
-- STEP 5: Verification queries
-- =====================================================

-- Show user_roles table structure
SELECT
  'user_roles table created' AS check_name,
  COUNT(*) AS row_count
FROM public.user_roles;

-- Show all users with their credits and roles
SELECT
  u.id,
  u.email,
  p.free_credits,
  c.balance AS top_up_balance,
  COALESCE(
    STRING_AGG(ur.role::text, ', ' ORDER BY ur.role),
    'NO ROLE'
  ) AS roles,
  (p.free_credits + COALESCE(c.balance, 0)) AS total_credits
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.credits c ON c.user_id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
GROUP BY u.id, u.email, p.free_credits, c.balance
ORDER BY u.created_at ASC;

-- Show admin users
SELECT
  u.email,
  ur.role,
  p.free_credits,
  c.balance AS top_up_balance
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.credits c ON c.user_id = u.id
WHERE ur.role = 'admin';

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CREDIT SYSTEM FIX APPLIED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Review the verification queries above';
  RAISE NOTICE '2. Deploy edge functions: npm run deploy:functions';
  RAISE NOTICE '3. Test the platform as admin user';
  RAISE NOTICE '========================================';
END $$;
