-- Add missing columns to generated_assets for better result tracking
ALTER TABLE generated_assets 
  ADD COLUMN IF NOT EXISTS action TEXT CHECK (action IN ('analyze', 'blend', 'upscale', 'generate', 'batch')),
  ADD COLUMN IF NOT EXISTS source_urls JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS params JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS share_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add index for faster share lookups
CREATE INDEX IF NOT EXISTS idx_generated_assets_share_slug ON generated_assets(share_slug);

-- Add index for action filtering
CREATE INDEX IF NOT EXISTS idx_generated_assets_action ON generated_assets(action);

-- Trigger to auto-generate share slug on insert
CREATE OR REPLACE FUNCTION generate_share_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_slug IS NULL THEN
    NEW.share_slug := encode(gen_random_bytes(8), 'base64')::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_share_slug
  BEFORE INSERT ON generated_assets
  FOR EACH ROW
  EXECUTE FUNCTION generate_share_slug();

-- Create idempotency cache table for double-click protection
CREATE TABLE IF NOT EXISTS idempotency_cache (
  key TEXT PRIMARY KEY,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index for auto-cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_cache(expires_at);

-- Enable RLS on idempotency_cache
ALTER TABLE idempotency_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Service role only (edge functions)
CREATE POLICY "Service role can manage idempotency cache"
  ON idempotency_cache
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');