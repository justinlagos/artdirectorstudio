-- Image versioning: image_versions table and canvas_items version columns

-- 1) Create image_versions table
CREATE TABLE IF NOT EXISTS public.image_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  root_image_id uuid NOT NULL,
  parent_version_id uuid REFERENCES public.image_versions(id) ON DELETE SET NULL,
  storage_url text,
  thumbnail_url text,
  metadata jsonb DEFAULT '{}',
  source_action text NOT NULL CHECK (source_action IN ('import', 'analyze', 'regenerate', 'effects', 'funlab')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_image_versions_root
  ON public.image_versions (root_image_id);
CREATE INDEX IF NOT EXISTS idx_image_versions_parent
  ON public.image_versions (parent_version_id);
CREATE INDEX IF NOT EXISTS idx_image_versions_created
  ON public.image_versions (root_image_id, created_at);

ALTER TABLE public.image_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own image_versions"
  ON public.image_versions FOR SELECT
  USING (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "Users can insert own image_versions"
  ON public.image_versions FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own image_versions"
  ON public.image_versions FOR UPDATE
  USING (created_by = auth.uid());

-- 2) Add version columns to canvas_items (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'canvas_items') THEN
    ALTER TABLE public.canvas_items
      ADD COLUMN IF NOT EXISTS image_version_id uuid REFERENCES public.image_versions(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS root_image_id uuid;
    CREATE INDEX IF NOT EXISTS idx_canvas_items_root_image_id
      ON public.canvas_items (root_image_id) WHERE root_image_id IS NOT NULL;
  END IF;
END $$;
