-- Community Posts Approval Workflow Migration
-- Date: January 29, 2026
-- Purpose: Add approval and featuring capabilities for community posts

-- Add approval columns to community_posts table
ALTER TABLE public.community_posts 
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_at timestamptz;

-- Add index for efficient querying of approved/featured posts
CREATE INDEX IF NOT EXISTS community_posts_approved_idx 
ON public.community_posts (is_approved, is_featured, likes_count DESC);

-- Add index for featured posts ordering
CREATE INDEX IF NOT EXISTS community_posts_featured_at_idx 
ON public.community_posts (featured_at DESC) 
WHERE is_featured = true;

-- Add index for pending posts (for admin moderation queue)
CREATE INDEX IF NOT EXISTS community_posts_pending_idx 
ON public.community_posts (created_at DESC) 
WHERE is_approved = false;

-- Comment on columns for documentation
COMMENT ON COLUMN public.community_posts.is_approved IS 'Whether the post has been approved by an admin for public display';
COMMENT ON COLUMN public.community_posts.approved_at IS 'Timestamp when the post was approved';
COMMENT ON COLUMN public.community_posts.approved_by IS 'User ID of the admin who approved the post';
COMMENT ON COLUMN public.community_posts.is_featured IS 'Whether the post is featured on the landing page';
COMMENT ON COLUMN public.community_posts.featured_at IS 'Timestamp when the post was featured';

-- Note: After running this migration, existing posts will have is_approved = false
-- To approve existing posts, run:
-- UPDATE public.community_posts SET is_approved = true WHERE is_approved IS NULL OR is_approved = false;
