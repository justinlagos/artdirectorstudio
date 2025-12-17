-- Community System Overhaul - Phase 1: Extend community_posts table
-- This migration adds metadata fields for remixing, attribution, moderation, and discovery

-- Add metadata fields for remixing and attribution
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS prompt TEXT,
  ADD COLUMN IF NOT EXISTS context_prompt TEXT,
  ADD COLUMN IF NOT EXISTS tool_used TEXT CHECK (tool_used IN ('studio', 'edit', 'blend', 'upscale', 'artie')),
  ADD COLUMN IF NOT EXISTS params JSONB,
  ADD COLUMN IF NOT EXISTS aspect_ratio TEXT,
  ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT 'google/gemini-3-pro-image-preview',
  
  -- Attribution
  ADD COLUMN IF NOT EXISTS remix_source_id UUID REFERENCES public.community_posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Moderation & Curation
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_staff_pick BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
  
  -- Discovery
  ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  
  -- Metadata (for future AI/search)
  ADD COLUMN IF NOT EXISTS style TEXT,
  ADD COLUMN IF NOT EXISTS mood TEXT,
  ADD COLUMN IF NOT EXISTS color_palette TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON public.community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_tool_used ON public.community_posts(tool_used) WHERE tool_used IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_posts_moderation ON public.community_posts(moderation_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_featured ON public.community_posts(is_featured, created_at DESC) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_community_posts_staff_pick ON public.community_posts(is_staff_pick, created_at DESC) WHERE is_staff_pick = true;
CREATE INDEX IF NOT EXISTS idx_community_posts_views ON public.community_posts(views_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_remix_source ON public.community_posts(remix_source_id) WHERE remix_source_id IS NOT NULL;

-- Add RLS policies for update/delete
DROP POLICY IF EXISTS "Users can update own posts" ON public.community_posts;
CREATE POLICY "Users can update own posts" ON public.community_posts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON public.community_posts;
CREATE POLICY "Users can delete own posts" ON public.community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Add trigger function to increment views_count
CREATE OR REPLACE FUNCTION public.increment_community_post_view()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.community_posts
    SET views_count = views_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment for documentation
COMMENT ON COLUMN public.community_posts.prompt IS 'Original prompt used to generate the image';
COMMENT ON COLUMN public.community_posts.tool_used IS 'Tool used to create the image: studio, edit, blend, upscale, or artie';
COMMENT ON COLUMN public.community_posts.is_featured IS 'Admin-curated featured content for landing page';
COMMENT ON COLUMN public.community_posts.is_staff_pick IS 'Admin-selected exceptional work';
COMMENT ON COLUMN public.community_posts.remix_source_id IS 'ID of the original post if this is a remix';
