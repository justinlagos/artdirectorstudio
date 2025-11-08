-- Add like_count column to custom_generation_presets
ALTER TABLE public.custom_generation_presets
ADD COLUMN like_count integer DEFAULT 0;

-- Create preset_likes table
CREATE TABLE public.preset_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_id uuid NOT NULL REFERENCES public.custom_generation_presets(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, preset_id)
);

-- Enable RLS on preset_likes
ALTER TABLE public.preset_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for preset_likes
CREATE POLICY "Users can view all preset likes"
ON public.preset_likes
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own preset likes"
ON public.preset_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preset likes"
ON public.preset_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Function to update preset like count
CREATE OR REPLACE FUNCTION public.update_preset_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.custom_generation_presets
    SET like_count = like_count + 1
    WHERE id = NEW.preset_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.custom_generation_presets
    SET like_count = like_count - 1
    WHERE id = OLD.preset_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger to update like count
CREATE TRIGGER update_preset_like_count_trigger
AFTER INSERT OR DELETE ON public.preset_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_preset_like_count();