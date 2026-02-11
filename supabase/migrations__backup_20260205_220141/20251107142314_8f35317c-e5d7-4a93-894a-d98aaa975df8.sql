-- Add new columns to profiles for subscription tiers and trial credits
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS daily_limit integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS daily_usage integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_usage_reset_at timestamptz DEFAULT date_trunc('day', now() + interval '1 day'),
  ADD COLUMN IF NOT EXISTS free_credits integer DEFAULT 10;

-- Create billing_events table for unified billing history
CREATE TABLE IF NOT EXISTS billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  amount_cents integer DEFAULT 0,
  currency text DEFAULT 'usd',
  stripe_payment_intent text,
  stripe_subscription_id text,
  stripe_invoice_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on billing_events
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own billing events
CREATE POLICY "Users can view their own billing events"
  ON billing_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all billing events
CREATE POLICY "Admins can view all billing events"
  ON billing_events
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Update handle_new_user function to grant 10 free trial credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with 10 free trial credits
  INSERT INTO public.profiles (id, email, free_credits)
  VALUES (new.id, new.email, 10);
  
  -- Insert initial credits record (legacy system, kept for backwards compatibility)
  INSERT INTO public.credits (user_id, balance)
  VALUES (new.id, 50);
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  -- Log trial credit grant in billing events
  INSERT INTO public.billing_events (user_id, event_type, amount_cents, metadata)
  VALUES (new.id, 'trial_credit_grant', 0, '{"credits": 10, "message": "Welcome! 10 free credits to explore ArtDirector Studio"}'::jsonb);
  
  RETURN new;
END;
$$;

-- Function to reset daily usage at midnight
CREATE OR REPLACE FUNCTION public.reset_daily_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET daily_usage = 0,
      daily_usage_reset_at = date_trunc('day', now() + interval '1 day')
  WHERE subscription_tier = 'starter'
    AND daily_usage_reset_at <= now();
END;
$$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_billing_events_user_id ON billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_daily_reset ON profiles(daily_usage_reset_at) WHERE subscription_tier = 'starter';