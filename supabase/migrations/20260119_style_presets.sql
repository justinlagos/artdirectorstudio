-- Create style_presets table for saving and reusing complete generation configurations

CREATE TABLE IF NOT EXISTS public.style_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  prompt_template TEXT NOT NULL,
  negative_prompts TEXT[] DEFAULT '{}',
  color_palette JSONB DEFAULT '[]'::jsonb,
  lighting JSONB DEFAULT '{}'::jsonb,
  composition JSONB DEFAULT '{}'::jsonb,
  quality TEXT DEFAULT 'auto' CHECK (quality IN ('high', 'medium', 'low', 'auto')),
  aspect_ratio TEXT DEFAULT '1:1' CHECK (aspect_ratio IN ('1:1', '4:5', '3:2', '2:3', '16:9', '9:16', '4:3', '3:4')),
  usage_count INTEGER DEFAULT 0,
  success_rate NUMERIC(3,2) DEFAULT 0.00,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.style_presets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own presets"
  ON public.style_presets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public presets"
  ON public.style_presets FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can insert their own presets"
  ON public.style_presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets"
  ON public.style_presets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets"
  ON public.style_presets FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_style_presets_user_id ON public.style_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_style_presets_is_public ON public.style_presets(is_public);
CREATE INDEX IF NOT EXISTS idx_style_presets_usage_count ON public.style_presets(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_style_presets_created_at ON public.style_presets(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_style_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_style_presets_updated_at
  BEFORE UPDATE ON public.style_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_style_presets_updated_at();

-- Add comments
COMMENT ON TABLE public.style_presets IS 'Style presets for saving and reusing complete generation configurations';
COMMENT ON COLUMN public.style_presets.color_palette IS 'Array of color objects extracted from style';
COMMENT ON COLUMN public.style_presets.lighting IS 'Lighting preferences: {type, intensity, direction}';
COMMENT ON COLUMN public.style_presets.composition IS 'Composition preferences: {ruleOfThirds, symmetry, etc.}';
COMMENT ON COLUMN public.style_presets.success_rate IS 'Success rate (0.00-1.00) based on user satisfaction';
