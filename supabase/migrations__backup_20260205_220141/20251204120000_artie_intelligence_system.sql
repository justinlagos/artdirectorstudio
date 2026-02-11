-- ============================================================================
-- ARTIE INTELLIGENCE SYSTEM - DATABASE SCHEMA
-- ============================================================================
-- 
-- This migration creates the database schema for Artie's intelligence system:
-- - Persistent conversations across sessions
-- - Context memory (images, briefs, preferences)
-- - User interactions for training data collection
-- - Image analysis caching
--
-- Created: 2025-12-04
-- ============================================================================

-- ============================================================================
-- 1. ARTIE CONVERSATIONS
-- ============================================================================
-- Stores conversation threads that persist across sessions

CREATE TABLE IF NOT EXISTS artie_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_artie_conversations_user 
  ON artie_conversations(user_id, updated_at DESC);

-- ============================================================================
-- 2. ARTIE MESSAGES
-- ============================================================================
-- Individual messages within conversations

CREATE TABLE IF NOT EXISTS artie_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES artie_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  tool_calls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for fast conversation message retrieval
CREATE INDEX IF NOT EXISTS idx_artie_messages_conversation 
  ON artie_messages(conversation_id, created_at);

-- ============================================================================
-- 3. ARTIE CONTEXT MEMORY
-- ============================================================================
-- Stores context: images, briefs, preferences, workflow steps

CREATE TABLE IF NOT EXISTS artie_context_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES artie_conversations(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL CHECK (context_type IN ('image', 'brief', 'preference', 'workflow')),
  context_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ, -- Optional expiry for temporary context
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for fast context retrieval
CREATE INDEX IF NOT EXISTS idx_artie_context_user 
  ON artie_context_memory(user_id, context_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_artie_context_conversation 
  ON artie_context_memory(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_artie_context_expiry 
  ON artie_context_memory(expires_at) 
  WHERE expires_at IS NOT NULL;

-- ============================================================================
-- 4. ARTIE USER INTERACTIONS (Training Data)
-- ============================================================================
-- Stores user interactions for training data collection
-- Users can opt-out via include_in_training flag

CREATE TABLE IF NOT EXISTS artie_user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES artie_conversations(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('message', 'tool_use', 'feedback', 'workflow')),
  interaction_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Privacy: allow users to opt-out
  include_in_training BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for analytics and training data export
CREATE INDEX IF NOT EXISTS idx_artie_interactions_user 
  ON artie_user_interactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_artie_interactions_training 
  ON artie_user_interactions(include_in_training, created_at DESC) 
  WHERE include_in_training = true;

CREATE INDEX IF NOT EXISTS idx_artie_interactions_type 
  ON artie_user_interactions(interaction_type, created_at DESC);

-- ============================================================================
-- 5. ARTIE IMAGE ANALYSIS CACHE
-- ============================================================================
-- Caches image analysis to avoid re-analyzing the same images

CREATE TABLE IF NOT EXISTS artie_image_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL UNIQUE,
  analysis JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast URL lookups
CREATE INDEX IF NOT EXISTS idx_artie_image_cache_url 
  ON artie_image_analysis_cache(image_url);

-- Index for cache cleanup (remove old, rarely accessed entries)
CREATE INDEX IF NOT EXISTS idx_artie_image_cache_cleanup 
  ON artie_image_analysis_cache(last_accessed_at, access_count);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE artie_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE artie_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE artie_context_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE artie_user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE artie_image_analysis_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CONVERSATIONS POLICIES
-- ============================================================================

-- Users can view their own conversations
CREATE POLICY "Users can view their own conversations" 
  ON artie_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own conversations
CREATE POLICY "Users can create their own conversations" 
  ON artie_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "Users can update their own conversations" 
  ON artie_conversations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own conversations
CREATE POLICY "Users can delete their own conversations" 
  ON artie_conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

-- Users can view messages in their conversations
CREATE POLICY "Users can view their messages" 
  ON artie_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM artie_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

-- Users can create messages in their conversations
CREATE POLICY "Users can create their messages" 
  ON artie_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM artie_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

-- Users can update messages in their conversations
CREATE POLICY "Users can update their messages" 
  ON artie_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM artie_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

-- Users can delete messages in their conversations
CREATE POLICY "Users can delete their messages" 
  ON artie_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM artie_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- CONTEXT MEMORY POLICIES
-- ============================================================================

-- Users can view their own context
CREATE POLICY "Users can view their context" 
  ON artie_context_memory
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own context
CREATE POLICY "Users can create their context" 
  ON artie_context_memory
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own context
CREATE POLICY "Users can update their context" 
  ON artie_context_memory
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own context
CREATE POLICY "Users can delete their context" 
  ON artie_context_memory
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- USER INTERACTIONS POLICIES
-- ============================================================================

-- Users can view their own interactions
CREATE POLICY "Users can view their interactions" 
  ON artie_user_interactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own interactions
CREATE POLICY "Users can create their interactions" 
  ON artie_user_interactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own interactions (e.g., opt-out)
CREATE POLICY "Users can update their interactions" 
  ON artie_user_interactions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own interactions
CREATE POLICY "Users can delete their interactions" 
  ON artie_user_interactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- IMAGE ANALYSIS CACHE POLICIES
-- ============================================================================

-- Anyone can read cached image analysis
CREATE POLICY "Anyone can read image analysis cache" 
  ON artie_image_analysis_cache
  FOR SELECT
  USING (true);

-- Only service role can manage cache
CREATE POLICY "Service role can manage image analysis cache" 
  ON artie_image_analysis_cache
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for artie_conversations
DROP TRIGGER IF EXISTS update_artie_conversations_updated_at ON artie_conversations;
CREATE TRIGGER update_artie_conversations_updated_at
  BEFORE UPDATE ON artie_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for artie_image_analysis_cache
DROP TRIGGER IF EXISTS update_artie_image_cache_updated_at ON artie_image_analysis_cache;
CREATE TRIGGER update_artie_image_cache_updated_at
  BEFORE UPDATE ON artie_image_analysis_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment access count on image cache
CREATE OR REPLACE FUNCTION increment_image_cache_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.access_count = OLD.access_count + 1;
  NEW.last_accessed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to track image cache access
DROP TRIGGER IF EXISTS track_image_cache_access ON artie_image_analysis_cache;
CREATE TRIGGER track_image_cache_access
  BEFORE UPDATE ON artie_image_analysis_cache
  FOR EACH ROW
  WHEN (OLD.analysis IS NOT DISTINCT FROM NEW.analysis)
  EXECUTE FUNCTION increment_image_cache_access();

-- Function to clean up expired context
CREATE OR REPLACE FUNCTION cleanup_expired_context()
RETURNS void AS $$
BEGIN
  DELETE FROM artie_context_memory
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE artie_conversations IS 'Persistent Artie conversation threads';
COMMENT ON TABLE artie_messages IS 'Individual messages within Artie conversations';
COMMENT ON TABLE artie_context_memory IS 'Context memory for Artie (images, briefs, preferences, workflow)';
COMMENT ON TABLE artie_user_interactions IS 'User interactions for training data collection';
COMMENT ON TABLE artie_image_analysis_cache IS 'Cache for image analysis to avoid re-processing';

COMMENT ON COLUMN artie_user_interactions.include_in_training IS 'Privacy flag: users can opt-out of training data collection';
COMMENT ON COLUMN artie_context_memory.expires_at IS 'Optional expiry for temporary context (e.g., workflow steps)';
