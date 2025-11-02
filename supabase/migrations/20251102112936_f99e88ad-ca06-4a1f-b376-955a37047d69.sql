-- Fix the foreign key relationship for shared_assets
-- Drop the existing foreign key to auth.users
ALTER TABLE public.shared_assets 
DROP CONSTRAINT IF EXISTS shared_assets_user_id_fkey;

-- Add foreign key to profiles table instead
ALTER TABLE public.shared_assets 
ADD CONSTRAINT shared_assets_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;