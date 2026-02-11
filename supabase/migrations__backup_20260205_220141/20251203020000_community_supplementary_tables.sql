-- Community System Overhaul - Phase 1: Supplementary tables
-- This migration creates tables for follows, reports, and view tracking

-- User follows
CREATE TABLE IF NOT EXISTS public.community_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT community_follows_unique UNIQUE (follower_id, following_id),
  CONSTRAINT community_follows_no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_community_follows_follower ON public.community_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_following ON public.community_follows(following_id);

ALTER TABLE public.community_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read follows" ON public.community_follows;
CREATE POLICY "Public read follows" ON public.community_follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow" ON public.community_follows;
CREATE POLICY "Users can follow" ON public.community_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON public.community_follows;
CREATE POLICY "Users can unfollow" ON public.community_follows FOR DELETE USING (auth.uid() = follower_id);

-- Post reports (moderation)
CREATE TABLE IF NOT EXISTS public.community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_community_reports_post ON public.community_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON public.community_reports(status, created_at DESC);

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can report posts" ON public.community_reports;
CREATE POLICY "Users can report posts" ON public.community_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- View tracking
CREATE TABLE IF NOT EXISTS public.community_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_views_post ON public.community_views(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_views_viewer ON public.community_views(viewer_id) WHERE viewer_id IS NOT NULL;

ALTER TABLE public.community_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert views" ON public.community_views;
CREATE POLICY "Public insert views" ON public.community_views FOR INSERT WITH CHECK (true);

-- Add trigger to increment views_count on community_posts
DROP TRIGGER IF EXISTS community_view_insert ON public.community_views;
CREATE TRIGGER community_view_insert
  AFTER INSERT ON public.community_views
  FOR EACH ROW EXECUTE FUNCTION public.increment_community_post_view();

-- Add function to track unique views (debounced by session)
CREATE OR REPLACE FUNCTION public.track_community_post_view(
  p_post_id UUID,
  p_viewer_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if view already exists in last 24 hours
  SELECT EXISTS(
    SELECT 1 FROM public.community_views
    WHERE post_id = p_post_id
      AND (
        (p_viewer_id IS NOT NULL AND viewer_id = p_viewer_id)
        OR (p_session_id IS NOT NULL AND session_id = p_session_id)
      )
      AND created_at > NOW() - INTERVAL '24 hours'
  ) INTO v_exists;
  
  IF NOT v_exists THEN
    INSERT INTO public.community_views (post_id, viewer_id, session_id)
    VALUES (p_post_id, p_viewer_id, p_session_id);
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE public.community_follows IS 'User-to-user follow relationships';
COMMENT ON TABLE public.community_reports IS 'User reports for content moderation';
COMMENT ON TABLE public.community_views IS 'View tracking for analytics (debounced by session)';
COMMENT ON FUNCTION public.track_community_post_view IS 'Track unique views with 24-hour debounce per session';
