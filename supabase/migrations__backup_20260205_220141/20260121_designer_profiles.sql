-- Create designer_profiles table for public designer portfolios

CREATE TABLE IF NOT EXISTS public.designer_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  specialties TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',
  featured_works TEXT[] DEFAULT '{}',
  available_for_work BOOLEAN DEFAULT false,
  hourly_rate NUMERIC(10,2),
  total_generations INTEGER DEFAULT 0,
  community_likes INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.designer_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view public profiles"
  ON public.designer_profiles FOR SELECT
  USING (true); -- All profiles are public

CREATE POLICY "Users can update their own profile"
  ON public.designer_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.designer_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_designer_profiles_username ON public.designer_profiles(username);
CREATE INDEX IF NOT EXISTS idx_designer_profiles_specialties ON public.designer_profiles USING gin(specialties);
CREATE INDEX IF NOT EXISTS idx_designer_profiles_industries ON public.designer_profiles USING gin(industries);
CREATE INDEX IF NOT EXISTS idx_designer_profiles_available ON public.designer_profiles(available_for_work) WHERE available_for_work = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_designer_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_designer_profiles_updated_at
  BEFORE UPDATE ON public.designer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_designer_profiles_updated_at();

-- Add comments
COMMENT ON TABLE public.designer_profiles IS 'Public designer profiles for portfolio and discovery';
COMMENT ON COLUMN public.designer_profiles.specialties IS 'Array of specialties: ["logo design", "branding", etc.]';
COMMENT ON COLUMN public.designer_profiles.industries IS 'Array of industries: ["tech", "fashion", etc.]';
