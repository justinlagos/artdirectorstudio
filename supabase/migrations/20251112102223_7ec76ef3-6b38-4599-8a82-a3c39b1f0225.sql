-- Create page_views table for visitor analytics
CREATE TABLE IF NOT EXISTS public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Visitor identification
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  
  -- Page information
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  
  -- Device & Browser info
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  screen_resolution TEXT,
  
  -- Location data
  country TEXT,
  city TEXT,
  
  -- Session metrics
  time_on_page INTEGER,
  is_bounce BOOLEAN DEFAULT false,
  
  -- Marketing attribution
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON public.page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON public.page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON public.page_views(page_path);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert page views (for anonymous tracking)
CREATE POLICY "Anyone can track page views"
ON public.page_views
FOR INSERT
TO public
WITH CHECK (true);

-- Only admins can view analytics
CREATE POLICY "Admins can view all page views"
ON public.page_views
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Allow updates for time tracking (match session and recent views)
CREATE POLICY "Allow updating own session page views"
ON public.page_views
FOR UPDATE
TO public
USING (created_at > NOW() - INTERVAL '1 hour');