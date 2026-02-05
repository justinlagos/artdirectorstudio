-- Create case_studies table for designer case studies

CREATE TABLE IF NOT EXISTS public.case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  challenge TEXT,
  solution TEXT,
  results TEXT,
  stages JSONB DEFAULT '[]'::jsonb,
  tools_used TEXT[] DEFAULT '{}',
  client TEXT,
  industry TEXT,
  published BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.case_studies ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view published case studies"
  ON public.case_studies FOR SELECT
  USING (published = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own case studies"
  ON public.case_studies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own case studies"
  ON public.case_studies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own case studies"
  ON public.case_studies FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_case_studies_user_id ON public.case_studies(user_id);
CREATE INDEX IF NOT EXISTS idx_case_studies_published ON public.case_studies(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_case_studies_likes ON public.case_studies(likes DESC);
CREATE INDEX IF NOT EXISTS idx_case_studies_created_at ON public.case_studies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_studies_industry ON public.case_studies(industry);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_case_studies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_case_studies_updated_at
  BEFORE UPDATE ON public.case_studies
  FOR EACH ROW
  EXECUTE FUNCTION update_case_studies_updated_at();

-- Add comments
COMMENT ON TABLE public.case_studies IS 'Designer case studies showcasing creative process and results';
COMMENT ON COLUMN public.case_studies.stages IS 'Array of process stages: [{title, description, imageUrl, order}]';
COMMENT ON COLUMN public.case_studies.tools_used IS 'Array of tools: ["Art Director Studio", "Photoshop", etc.]';
