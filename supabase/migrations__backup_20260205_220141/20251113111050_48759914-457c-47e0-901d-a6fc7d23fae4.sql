-- Ensure pgcrypto extension is enabled for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate the share slug generation function to ensure it works
CREATE OR REPLACE FUNCTION generate_share_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_slug IS NULL THEN
    NEW.share_slug := encode(gen_random_bytes(8), 'base64')::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;