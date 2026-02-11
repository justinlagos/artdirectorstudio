-- Create custom generation presets table
CREATE TABLE IF NOT EXISTS public.custom_generation_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '✨',
  category TEXT NOT NULL DEFAULT 'custom',
  options JSONB NOT NULL DEFAULT '{"quality": "auto", "size": "1024x1024", "background": "auto"}'::jsonb,
  prompt_modifier TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.custom_generation_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own presets"
  ON public.custom_generation_presets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public presets"
  ON public.custom_generation_presets
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can create their own presets"
  ON public.custom_generation_presets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets"
  ON public.custom_generation_presets
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets"
  ON public.custom_generation_presets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_custom_presets_user_id ON public.custom_generation_presets(user_id);
CREATE INDEX idx_custom_presets_public ON public.custom_generation_presets(is_public) WHERE is_public = true;

-- Create trigger for updated_at
CREATE TRIGGER update_custom_presets_updated_at
  BEFORE UPDATE ON public.custom_generation_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();