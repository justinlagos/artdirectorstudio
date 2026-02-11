-- Create activity log table for inspire page changes
CREATE TABLE public.inspire_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_asset_id UUID NOT NULL REFERENCES public.shared_assets(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  admin_email TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('featured', 'unfeatured', 'staff_pick_added', 'staff_pick_removed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inspire_activity ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view activity feed
CREATE POLICY "Anyone can view activity feed"
  ON public.inspire_activity
  FOR SELECT
  USING (true);

-- Enable realtime
ALTER TABLE public.inspire_activity REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inspire_activity;

-- Create function to log featured/staff pick changes
CREATE OR REPLACE FUNCTION public.log_inspire_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_email_val TEXT;
BEGIN
  -- Get admin email from profiles table
  SELECT email INTO admin_email_val
  FROM public.profiles
  WHERE id = auth.uid();

  -- Log featured changes
  IF TG_OP = 'UPDATE' AND OLD.featured IS DISTINCT FROM NEW.featured THEN
    INSERT INTO public.inspire_activity (
      shared_asset_id,
      admin_id,
      admin_email,
      action_type
    ) VALUES (
      NEW.id,
      auth.uid(),
      COALESCE(admin_email_val, 'unknown@admin.com'),
      CASE WHEN NEW.featured THEN 'featured' ELSE 'unfeatured' END
    );
  END IF;

  -- Log staff pick changes
  IF TG_OP = 'UPDATE' AND OLD.staff_pick IS DISTINCT FROM NEW.staff_pick THEN
    INSERT INTO public.inspire_activity (
      shared_asset_id,
      admin_id,
      admin_email,
      action_type
    ) VALUES (
      NEW.id,
      auth.uid(),
      COALESCE(admin_email_val, 'unknown@admin.com'),
      CASE WHEN NEW.staff_pick THEN 'staff_pick_added' ELSE 'staff_pick_removed' END
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on shared_assets
CREATE TRIGGER log_inspire_activity_trigger
  AFTER UPDATE ON public.shared_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_inspire_activity();

-- Create index for performance
CREATE INDEX idx_inspire_activity_created_at ON public.inspire_activity(created_at DESC);