-- Migration: Enhanced Generation Metadata
-- Adds prompt versioning, structured prompt storage, and operation lineage tracking

-- Add new columns to generated_assets for enhanced metadata
ALTER TABLE public.generated_assets
  ADD COLUMN IF NOT EXISTS prompt_version TEXT,
  ADD COLUMN IF NOT EXISTS full_prompt_object JSONB,
  ADD COLUMN IF NOT EXISTS negative_prompt_object JSONB,
  ADD COLUMN IF NOT EXISTS source_asset_id UUID REFERENCES public.generated_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operation_type TEXT CHECK (operation_type IN ('generate', 'upscale', 'background_remove', 'blend', 'edit')),
  ADD COLUMN IF NOT EXISTS model_used TEXT,
  ADD COLUMN IF NOT EXISTS seed INTEGER,
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS guidance_scale NUMERIC(4, 2),
  ADD COLUMN IF NOT EXISTS steps INTEGER;

-- Create index for operation type queries
CREATE INDEX IF NOT EXISTS idx_generated_assets_operation_type 
  ON public.generated_assets(operation_type);

-- Create index for source asset lineage tracking
CREATE INDEX IF NOT EXISTS idx_generated_assets_source_asset 
  ON public.generated_assets(source_asset_id) 
  WHERE source_asset_id IS NOT NULL;

-- Create index for prompt version queries (for debugging/reproducibility)
CREATE INDEX IF NOT EXISTS idx_generated_assets_prompt_version 
  ON public.generated_assets(prompt_version) 
  WHERE prompt_version IS NOT NULL;

-- Create index for model tracking
CREATE INDEX IF NOT EXISTS idx_generated_assets_model 
  ON public.generated_assets(model_used) 
  WHERE model_used IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.generated_assets.prompt_version IS 'Version of the prompt engine used (e.g., v1.0.0)';
COMMENT ON COLUMN public.generated_assets.full_prompt_object IS 'Structured prompt object with sections and metadata';
COMMENT ON COLUMN public.generated_assets.negative_prompt_object IS 'Structured negative prompt object';
COMMENT ON COLUMN public.generated_assets.source_asset_id IS 'Reference to source asset for derivative operations (upscale, edit, blend)';
COMMENT ON COLUMN public.generated_assets.operation_type IS 'Type of operation that created this asset';
COMMENT ON COLUMN public.generated_assets.model_used IS 'AI model identifier used for generation';
COMMENT ON COLUMN public.generated_assets.seed IS 'Random seed for reproducibility';
COMMENT ON COLUMN public.generated_assets.width IS 'Image width in pixels';
COMMENT ON COLUMN public.generated_assets.height IS 'Image height in pixels';
COMMENT ON COLUMN public.generated_assets.guidance_scale IS 'Guidance scale parameter used';
COMMENT ON COLUMN public.generated_assets.steps IS 'Number of generation steps';
