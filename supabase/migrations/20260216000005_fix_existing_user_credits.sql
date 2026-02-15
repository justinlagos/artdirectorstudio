-- Fix default free_credits for all existing users who have 0
-- This ensures existing users get the proper starting credits

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

-- Comments
COMMENT ON COLUMN public.profiles.free_credits IS 'Free credits granted to user (default 59 for new signups)';
