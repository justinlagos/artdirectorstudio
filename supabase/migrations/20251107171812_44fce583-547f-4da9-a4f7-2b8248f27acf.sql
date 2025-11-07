-- Add missing columns to shared_assets if not present
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shared_assets' AND column_name = 'staff_pick') THEN
    ALTER TABLE public.shared_assets ADD COLUMN staff_pick boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shared_assets' AND column_name = 'style') THEN
    ALTER TABLE public.shared_assets ADD COLUMN style text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shared_assets' AND column_name = 'color_palette') THEN
    ALTER TABLE public.shared_assets ADD COLUMN color_palette text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shared_assets' AND column_name = 'mood') THEN
    ALTER TABLE public.shared_assets ADD COLUMN mood text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shared_assets' AND column_name = 'composition') THEN
    ALTER TABLE public.shared_assets ADD COLUMN composition text;
  END IF;
END $$;

-- Create user_follows table if not exists
CREATE TABLE IF NOT EXISTS public.user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable RLS on all social tables
ALTER TABLE public.asset_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_likes
DROP POLICY IF EXISTS "Users can view all likes" ON public.asset_likes;
CREATE POLICY "Users can view all likes" ON public.asset_likes
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can like assets" ON public.asset_likes;
CREATE POLICY "Users can like assets" ON public.asset_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike their own likes" ON public.asset_likes;
CREATE POLICY "Users can unlike their own likes" ON public.asset_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for asset_bookmarks
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.asset_bookmarks;
CREATE POLICY "Users can view their own bookmarks" ON public.asset_bookmarks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can bookmark assets" ON public.asset_bookmarks;
CREATE POLICY "Users can bookmark assets" ON public.asset_bookmarks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own bookmarks" ON public.asset_bookmarks;
CREATE POLICY "Users can remove their own bookmarks" ON public.asset_bookmarks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for user_follows
DROP POLICY IF EXISTS "Users can view all follows" ON public.user_follows;
CREATE POLICY "Users can view all follows" ON public.user_follows
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON public.user_follows;
CREATE POLICY "Users can follow others" ON public.user_follows
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON public.user_follows;
CREATE POLICY "Users can unfollow" ON public.user_follows
  FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- RLS Policies for shared_assets (make viewable by everyone)
DROP POLICY IF EXISTS "Public shared assets are viewable by all" ON public.shared_assets;
CREATE POLICY "Public shared assets are viewable by all" ON public.shared_assets
  FOR SELECT TO public USING (is_public = true);

DROP POLICY IF EXISTS "Admins can update shared assets" ON public.shared_assets;
CREATE POLICY "Admins can update shared assets" ON public.shared_assets
  FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete shared assets" ON public.shared_assets;
CREATE POLICY "Admins can delete shared assets" ON public.shared_assets
  FOR DELETE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shared_assets_staff_pick ON public.shared_assets(staff_pick) WHERE staff_pick = true;
CREATE INDEX IF NOT EXISTS idx_shared_assets_featured ON public.shared_assets(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_shared_assets_style ON public.shared_assets(style);
CREATE INDEX IF NOT EXISTS idx_shared_assets_filters ON public.shared_assets(style, color_palette, mood, composition);
CREATE INDEX IF NOT EXISTS idx_asset_likes_user ON public.asset_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_likes_asset ON public.asset_likes(shared_asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_bookmarks_user ON public.asset_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);