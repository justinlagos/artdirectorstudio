-- Add featured flag and tags to shared_assets
ALTER TABLE public.shared_assets 
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '{"style": [], "color": [], "mood": [], "composition": []}'::jsonb,
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bookmark_count INTEGER DEFAULT 0;

-- Create likes table
CREATE TABLE IF NOT EXISTS public.asset_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_asset_id UUID NOT NULL REFERENCES public.shared_assets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, shared_asset_id)
);

ALTER TABLE public.asset_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes"
ON public.asset_likes FOR SELECT
USING (true);

CREATE POLICY "Users can create their own likes"
ON public.asset_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
ON public.asset_likes FOR DELETE
USING (auth.uid() = user_id);

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS public.asset_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_asset_id UUID NOT NULL REFERENCES public.shared_assets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, shared_asset_id)
);

ALTER TABLE public.asset_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookmarks"
ON public.asset_bookmarks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
ON public.asset_bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
ON public.asset_bookmarks FOR DELETE
USING (auth.uid() = user_id);

-- Create follows table
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all follows"
ON public.user_follows FOR SELECT
USING (true);

CREATE POLICY "Users can create their own follows"
ON public.user_follows FOR INSERT
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follows"
ON public.user_follows FOR DELETE
USING (auth.uid() = follower_id);

-- Create function to update like count
CREATE OR REPLACE FUNCTION public.update_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.shared_assets
    SET like_count = like_count + 1
    WHERE id = NEW.shared_asset_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.shared_assets
    SET like_count = like_count - 1
    WHERE id = OLD.shared_asset_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to update bookmark count
CREATE OR REPLACE FUNCTION public.update_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.shared_assets
    SET bookmark_count = bookmark_count + 1
    WHERE id = NEW.shared_asset_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.shared_assets
    SET bookmark_count = bookmark_count - 1
    WHERE id = OLD.shared_asset_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS on_like_change ON public.asset_likes;
CREATE TRIGGER on_like_change
AFTER INSERT OR DELETE ON public.asset_likes
FOR EACH ROW EXECUTE FUNCTION public.update_like_count();

DROP TRIGGER IF EXISTS on_bookmark_change ON public.asset_bookmarks;
CREATE TRIGGER on_bookmark_change
AFTER INSERT OR DELETE ON public.asset_bookmarks
FOR EACH ROW EXECUTE FUNCTION public.update_bookmark_count();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_shared_assets_featured ON public.shared_assets(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_shared_assets_tags ON public.shared_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_asset_likes_user ON public.asset_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_bookmarks_user ON public.asset_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);