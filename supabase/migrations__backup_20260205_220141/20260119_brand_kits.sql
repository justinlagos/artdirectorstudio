-- Create brand_kits table for brand guideline management
-- Allows users to upload brand guidelines and enforce consistency

CREATE TABLE IF NOT EXISTS public.brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  logo_url TEXT,
  color_palette JSONB DEFAULT '[]'::jsonb,
  typography JSONB DEFAULT '{}'::jsonb,
  usage_rules JSONB DEFAULT '{}'::jsonb,
  enforce_colors BOOLEAN DEFAULT true,
  enforce_style BOOLEAN DEFAULT true,
  flag_deviations BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, brand_name)
);

-- Enable RLS
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own brand kits"
  ON public.brand_kits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brand kits"
  ON public.brand_kits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand kits"
  ON public.brand_kits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand kits"
  ON public.brand_kits FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_brand_kits_user_id ON public.brand_kits(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_kits_brand_name ON public.brand_kits(brand_name);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_brand_kits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_brand_kits_updated_at
  BEFORE UPDATE ON public.brand_kits
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_kits_updated_at();

-- Add comments
COMMENT ON TABLE public.brand_kits IS 'Brand guideline kits for enforcing visual consistency';
COMMENT ON COLUMN public.brand_kits.color_palette IS 'Array of color objects: {name, hex, type: "primary|secondary|accent"}';
COMMENT ON COLUMN public.brand_kits.typography IS 'Typography rules: {primaryFont, secondaryFont, headingFont, bodyFont}';
COMMENT ON COLUMN public.brand_kits.usage_rules IS 'Brand usage rules extracted from guidelines PDF';
