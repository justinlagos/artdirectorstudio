-- Create shared_assets table for sharing and collaboration
CREATE TABLE public.shared_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.generated_assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_assets ENABLE ROW LEVEL SECURITY;

-- Users can view their own shared assets
CREATE POLICY "Users can view their own shared assets"
ON public.shared_assets
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own shared assets
CREATE POLICY "Users can create their own shared assets"
ON public.shared_assets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own shared assets
CREATE POLICY "Users can update their own shared assets"
ON public.shared_assets
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own shared assets
CREATE POLICY "Users can delete their own shared assets"
ON public.shared_assets
FOR DELETE
USING (auth.uid() = user_id);

-- Anyone can view public shared assets
CREATE POLICY "Anyone can view public shared assets"
ON public.shared_assets
FOR SELECT
USING (is_public = true);

-- Create index for share_token lookups
CREATE INDEX idx_shared_assets_share_token ON public.shared_assets(share_token);

-- Create index for public gallery
CREATE INDEX idx_shared_assets_public ON public.shared_assets(is_public, created_at DESC) WHERE is_public = true;

-- Add trigger for updated_at
CREATE TRIGGER update_shared_assets_updated_at
BEFORE UPDATE ON public.shared_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_share_view_count(share_token_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shared_assets
  SET view_count = view_count + 1
  WHERE share_token = share_token_param;
END;
$$;