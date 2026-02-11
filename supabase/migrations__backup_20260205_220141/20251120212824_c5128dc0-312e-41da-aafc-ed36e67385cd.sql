-- Phase 4: Performance Indexes and Soft Deletes
-- Note: Indexes created without CONCURRENTLY to avoid transaction block issues

-- ============================================
-- PART 1: PERFORMANCE INDEXES
-- ============================================

-- Index for common History page query (user_id + created_at DESC)
CREATE INDEX IF NOT EXISTS idx_generated_assets_user_created 
  ON generated_assets(user_id, created_at DESC);

-- Index for filtering by type and action
CREATE INDEX IF NOT EXISTS idx_generated_assets_type_action 
  ON generated_assets(type, action) WHERE type = 'image';

-- Index for featured items on Inspire feed
CREATE INDEX IF NOT EXISTS idx_shared_assets_featured 
  ON shared_assets(featured, created_at DESC) WHERE featured = true;

-- Index for approved Inspire content
CREATE INDEX IF NOT EXISTS idx_shared_assets_inspire 
  ON shared_assets(is_inspire_approved, created_at DESC) 
  WHERE is_inspire_approved = true AND is_deleted = false;

-- Index for user's shared assets
CREATE INDEX IF NOT EXISTS idx_shared_assets_user_created 
  ON shared_assets(user_id, created_at DESC);

-- Full-text search index for prompts
CREATE INDEX IF NOT EXISTS idx_generated_assets_prompt_fts
  ON generated_assets USING GIN(to_tsvector('english', COALESCE(prompt, '')));

-- Index for subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_tier_credits
  ON profiles(subscription_tier, free_credits) 
  WHERE subscription_tier IS NOT NULL;

-- Index for credit transaction history
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_timestamp
  ON credit_transactions(user_id, timestamp DESC);

-- ============================================
-- PART 2: SOFT DELETES
-- ============================================

-- Add soft delete column to generated_assets
ALTER TABLE generated_assets 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for filtering out deleted items
CREATE INDEX IF NOT EXISTS idx_generated_assets_deleted 
  ON generated_assets(deleted_at) WHERE deleted_at IS NULL;

-- Update RLS policy to exclude soft-deleted items
DROP POLICY IF EXISTS "Users can view own assets" ON generated_assets;
CREATE POLICY "Users can view own assets"
  ON generated_assets FOR SELECT
  USING (
    auth.uid() = user_id 
    AND (deleted_at IS NULL OR deleted_at > NOW())
  );

-- Soft delete function (marks as deleted without removing)
CREATE OR REPLACE FUNCTION soft_delete_asset(asset_id UUID)
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE generated_assets
  SET deleted_at = NOW()
  WHERE id = asset_id AND user_id = auth.uid();
END;
$$;

-- Undelete function (restores soft-deleted items)
CREATE OR REPLACE FUNCTION undelete_asset(asset_id UUID)
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE generated_assets
  SET deleted_at = NULL
  WHERE id = asset_id AND user_id = auth.uid();
END;
$$;

-- Function to permanently delete old soft-deleted items (cleanup)
CREATE OR REPLACE FUNCTION cleanup_deleted_assets(days_old INTEGER DEFAULT 30)
RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM generated_assets
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - (days_old || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;