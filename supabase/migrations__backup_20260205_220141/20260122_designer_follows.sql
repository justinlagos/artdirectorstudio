-- Create designer_follows table for follow/unfollow functionality

CREATE TABLE IF NOT EXISTS public.designer_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE public.designer_follows ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all follows"
  ON public.designer_follows FOR SELECT
  USING (true); -- Public read for follower counts

CREATE POLICY "Users can insert their own follows"
  ON public.designer_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follows"
  ON public.designer_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_designer_follows_follower ON public.designer_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_designer_follows_following ON public.designer_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_designer_follows_created_at ON public.designer_follows(created_at DESC);

-- Function to update follower count in designer_profiles
CREATE OR REPLACE FUNCTION update_designer_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update following count when follow is created
  IF TG_OP = 'INSERT' THEN
    UPDATE public.designer_profiles
    SET followers = (
      SELECT COUNT(*) 
      FROM public.designer_follows 
      WHERE following_id = NEW.following_id
    )
    WHERE user_id = NEW.following_id;
    RETURN NEW;
  END IF;

  -- Update following count when follow is deleted
  IF TG_OP = 'DELETE' THEN
    UPDATE public.designer_profiles
    SET followers = (
      SELECT COUNT(*) 
      FROM public.designer_follows 
      WHERE following_id = OLD.following_id
    )
    WHERE user_id = OLD.following_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update follower counts
CREATE TRIGGER update_follower_count_trigger
  AFTER INSERT OR DELETE ON public.designer_follows
  FOR EACH ROW
  EXECUTE FUNCTION update_designer_follower_count();

-- Add comments
COMMENT ON TABLE public.designer_follows IS 'Tracks which users follow which designers';
COMMENT ON COLUMN public.designer_follows.follower_id IS 'User who is following';
COMMENT ON COLUMN public.designer_follows.following_id IS 'Designer being followed';
