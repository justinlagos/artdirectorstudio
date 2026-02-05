-- Create artie_strategic_insights table for proactive Artie suggestions
-- This table stores contextual suggestions that Artie generates proactively

CREATE TABLE IF NOT EXISTS public.artie_strategic_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  dismissed BOOLEAN DEFAULT false,
  action_taken BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  dismissed_at TIMESTAMPTZ,
  action_taken_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.artie_strategic_insights ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own insights"
  ON public.artie_strategic_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights"
  ON public.artie_strategic_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights"
  ON public.artie_strategic_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insights"
  ON public.artie_strategic_insights FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_artie_insights_user_id ON public.artie_strategic_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_artie_insights_trigger_type ON public.artie_strategic_insights(trigger_type);
CREATE INDEX IF NOT EXISTS idx_artie_insights_priority ON public.artie_strategic_insights(priority);
CREATE INDEX IF NOT EXISTS idx_artie_insights_dismissed ON public.artie_strategic_insights(dismissed);
CREATE INDEX IF NOT EXISTS idx_artie_insights_created_at ON public.artie_strategic_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artie_insights_user_active ON public.artie_strategic_insights(user_id, dismissed, created_at DESC)
  WHERE dismissed = false;

-- Add comment for documentation
COMMENT ON TABLE public.artie_strategic_insights IS 'Stores proactive suggestions from Artie based on user workflow triggers';
COMMENT ON COLUMN public.artie_strategic_insights.trigger_type IS 'Type of trigger: brief_uploaded, generation_complete, iteration_count, style_drift, etc.';
COMMENT ON COLUMN public.artie_strategic_insights.context IS 'Additional context data for the suggestion (image URLs, prompts, counts, etc.)';
COMMENT ON COLUMN public.artie_strategic_insights.priority IS 'Priority level: high (urgent), medium (helpful), low (optional)';
