-- Add subscription columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT NULL,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT NULL;

-- Create index for faster subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON public.profiles(is_pro, subscription_expires_at);

-- Create function to check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  SELECT is_pro, subscription_expires_at INTO user_profile
  FROM public.profiles
  WHERE id = user_id_param;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if pro and not expired
  RETURN user_profile.is_pro AND 
         (user_profile.subscription_expires_at IS NULL OR 
          user_profile.subscription_expires_at > NOW());
END;
$$;