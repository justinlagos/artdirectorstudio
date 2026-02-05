-- ============================================================================
-- CANVAS DOCUMENTS SYSTEM - CORE TABLES
-- ============================================================================
-- 
-- This migration creates the database schema for the Canvas-first design workspace:
-- - documents: Single source of truth for canvas state
-- - assets: Image/mask/vector assets referenced by layers
-- - actions: Immutable action log for undo/redo
-- - user_preferences: Extended with active_document_id and last_view_mode
--
-- Created: 2026-01-23
-- ============================================================================

-- ============================================================================
-- 1. DOCUMENTS TABLE
-- ============================================================================
-- Single source of truth for canvas state

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- For future team support
  title TEXT NOT NULL DEFAULT 'Untitled',
  width INTEGER NOT NULL DEFAULT 1920,
  height INTEGER NOT NULL DEFAULT 1080,
  background JSONB NOT NULL DEFAULT '{"type": "solid", "color": "#ffffff"}'::jsonb,
  layers JSONB NOT NULL DEFAULT '{"order": [], "nodes": {}, "groups": {}}'::jsonb,
  selection JSONB NOT NULL DEFAULT '{"selectedLayerId": null}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{"brandKit": {}, "stylePresets": {}, "docPrefs": {"grid": false, "snapping": false}}'::jsonb,
  history JSONB NOT NULL DEFAULT '{"headActionId": null, "cursorActionId": null, "length": 0}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_team ON public.documents(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_version ON public.documents(id, version);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = team_id);

CREATE POLICY "Users can insert their own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own documents"
  ON public.documents FOR UPDATE
  USING (auth.uid() = owner_id OR auth.uid() = team_id);

CREATE POLICY "Users can delete their own documents"
  ON public.documents FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- 2. ASSETS TABLE
-- ============================================================================
-- Image/mask/vector assets referenced by layers

CREATE TYPE asset_type AS ENUM ('image', 'mask', 'depth', 'vector', 'upload');

CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type asset_type NOT NULL,
  storage_url TEXT NOT NULL,
  thumb_url TEXT,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb, -- prompt/model/seed/etc
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_document ON public.assets(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_owner ON public.assets(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_type ON public.assets(type);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own assets"
  ON public.assets FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can view assets in their documents"
  ON public.assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = assets.document_id
      AND (documents.owner_id = auth.uid() OR documents.team_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert their own assets"
  ON public.assets FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own assets"
  ON public.assets FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own assets"
  ON public.assets FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- 3. ACTIONS TABLE
-- ============================================================================
-- Immutable action log for undo/redo

CREATE TABLE IF NOT EXISTS public.actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  inverse JSONB NOT NULL,
  client_id TEXT, -- For client-side deduplication
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for fast history traversal
CREATE INDEX IF NOT EXISTS idx_actions_document ON public.actions(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actions_document_client ON public.actions(document_id, client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_actions_user ON public.actions(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view actions in their documents"
  ON public.actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = actions.document_id
      AND (documents.owner_id = auth.uid() OR documents.team_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert actions in their documents"
  ON public.actions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = actions.document_id
      AND (documents.owner_id = auth.uid() OR documents.team_id = auth.uid())
    )
  );

-- Actions are immutable - no UPDATE or DELETE policies

-- ============================================================================
-- 4. UPDATE USER_PREFERENCES TABLE
-- ============================================================================
-- Extend existing user_preferences (or create if using separate table)

-- Check if user_preferences table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_preferences'
  ) THEN
    CREATE TABLE public.user_preferences (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      last_view_mode TEXT CHECK (last_view_mode IN ('classic', 'canvas')),
      active_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
      ui_prefs JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view their own preferences"
      ON public.user_preferences FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can update their own preferences"
      ON public.user_preferences FOR UPDATE
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own preferences"
      ON public.user_preferences FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  ELSE
    -- Add columns if they don't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_preferences' 
      AND column_name = 'last_view_mode'
    ) THEN
      ALTER TABLE public.user_preferences 
      ADD COLUMN last_view_mode TEXT CHECK (last_view_mode IN ('classic', 'canvas'));
    END IF;

    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_preferences' 
      AND column_name = 'active_document_id'
    ) THEN
      ALTER TABLE public.user_preferences 
      ADD COLUMN active_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Update updated_at on documents
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- Update updated_at on user_preferences
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE public.documents IS 'Single source of truth for canvas documents. All layer state, selection, and history stored here.';
COMMENT ON COLUMN public.documents.layers IS 'LayerGraph: {order: string[], nodes: Record<string, LayerNode>, groups: Record<string, any>}';
COMMENT ON COLUMN public.documents.selection IS 'Current selection: {selectedLayerId: string|null}';
COMMENT ON COLUMN public.documents.history IS 'Action history: {headActionId: uuid|null, cursorActionId: uuid|null, length: number}';
COMMENT ON COLUMN public.documents.version IS 'Monotonic version number for optimistic locking';

COMMENT ON TABLE public.assets IS 'Image/mask/vector assets referenced by document layers';
COMMENT ON COLUMN public.assets.metadata IS 'Generation metadata: prompt, model, seed, etc.';

COMMENT ON TABLE public.actions IS 'Immutable action log. All layer mutations go through actions for undo/redo.';
COMMENT ON COLUMN public.actions.inverse IS 'Exact prior values needed for undo';
COMMENT ON COLUMN public.actions.client_id IS 'Client-side deduplication ID';

-- ============================================================================
-- 7. FORCE POSTGREST SCHEMA RELOAD
-- ============================================================================
-- Trigger PostgREST to reload its schema cache so the new tables are immediately available
-- This prevents "Could not find the table 'public.documents' in the schema cache" errors

DO $$
BEGIN
  -- Notify PostgREST to reload schema
  PERFORM pg_notify('pgrst', 'reload schema');
  
  -- Also try alternative notification channel (some Supabase setups use this)
  PERFORM pg_notify('postgrest', 'reload');
EXCEPTION
  WHEN OTHERS THEN
    -- If pg_notify fails, it's not critical - PostgREST will auto-reload eventually
    RAISE NOTICE 'Could not notify PostgREST to reload schema: %', SQLERRM;
END $$;
