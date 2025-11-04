-- Add onboarding flag to profiles table
ALTER TABLE public.profiles 
ADD COLUMN has_seen_onboarding BOOLEAN DEFAULT false NOT NULL;