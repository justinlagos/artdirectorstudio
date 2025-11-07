-- Enable realtime for credits table
ALTER TABLE public.credits REPLICA IDENTITY FULL;

-- Add credits table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.credits;