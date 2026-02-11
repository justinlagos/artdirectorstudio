-- Enable realtime for shared_assets table
ALTER TABLE public.shared_assets REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_assets;