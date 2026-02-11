-- Add ui_preferences column to profiles table for user UI preferences
-- This migration creates the profiles table if it doesn't exist, then adds the ui_preferences column

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on profiles (idempotent - safe to run multiple times)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at (DROP IF EXISTS then CREATE to make it idempotent)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create policies using DO block with dynamic SQL (since CREATE POLICY can't be conditional)
DO $$
BEGIN
  -- Create "Users can view their own profile" policy if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can view their own profile'
  ) THEN
    EXECUTE format('CREATE POLICY %I ON public.profiles FOR SELECT USING (auth.uid() = id)', 
      'Users can view their own profile'
    );
  END IF;

  -- Create "Users can update their own profile" policy if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can update their own profile'
  ) THEN
    EXECUTE format('CREATE POLICY %I ON public.profiles FOR UPDATE USING (auth.uid() = id)', 
      'Users can update their own profile'
    );
  END IF;
END $$;

-- Add ui_preferences column if it doesn't exist (using DO block for conditional logic)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'ui_preferences'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN ui_preferences jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create index for faster queries on ui_preferences (idempotent)
CREATE INDEX IF NOT EXISTS idx_profiles_ui_preferences 
ON public.profiles USING gin(ui_preferences);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.ui_preferences IS 'User UI preferences including workspace mode, keyboard shortcuts, experimental features, and generation defaults';
