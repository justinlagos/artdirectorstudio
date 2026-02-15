-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create profile with 59 free credits
  INSERT INTO public.profiles (id, free_credits)
  VALUES (NEW.id, 59)
  ON CONFLICT (id) DO NOTHING;

  -- Initialize credits balance
  INSERT INTO public.credits (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Comments
COMMENT ON FUNCTION public.handle_new_user() IS 'Initializes profile, credits, and role for new users';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Automatically sets up new user accounts with default credits and role';
