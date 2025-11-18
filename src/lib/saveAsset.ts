/**
 * Unified Asset Saving Utility
 * Ensures all generated/edited images are saved to generated_assets table
 * This is the single source of truth for saving assets
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SaveAssetOptions {
  imageUrl: string;
  action: 'generate' | 'edit' | 'upscale' | 'blend' | 'batch_analyze' | 'batch_upscale' | 'batch_blend';
  prompt?: string;
  sourceUrls?: string[];
  params?: Record<string, unknown>;
  analysisData?: Record<string, unknown>;
  durationMs?: number;
  skipToast?: boolean;
}

/**
 * Save an asset to generated_assets table
 * This is the unified save function used by all tools
 */
export async function saveAsset(options: SaveAssetOptions): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[SaveAsset] No user found');
      return null;
    }

    // Check if asset already exists
    const { data: existing } = await supabase
      .from('generated_assets')
      .select('id')
      .eq('user_id', user.id)
      .eq('image_url', options.imageUrl)
      .single();

    if (existing) {
      console.log('[SaveAsset] Asset already exists:', existing.id);
      return existing.id;
    }

    // Insert new asset
    const { data: assetData, error: dbError } = await supabase
      .from('generated_assets')
      .insert([{
        user_id: user.id,
        type: 'image',
        action: options.action,
        image_url: options.imageUrl,
        prompt: options.prompt || `${options.action} image`,
        source_urls: options.sourceUrls || null,
        params: options.params || {},
        analysis_data: options.analysisData || null,
        duration_ms: options.durationMs || null,
      }])
      .select()
      .single();

    if (dbError) {
      console.error('[SaveAsset] Database error:', dbError);
      throw dbError;
    }

    if (assetData) {
      console.log('[SaveAsset] Asset saved successfully:', assetData.id);
      if (!options.skipToast) {
        toast.success("Saved to My Projects", {
          description: "Your image has been added to your project history",
        });
      }
      return assetData.id;
    }

    return null;
  } catch (error) {
    console.error('[SaveAsset] Error saving asset:', error);
    if (!options.skipToast) {
      toast.error("Failed to save to My Projects", {
        description: "Image was created but couldn't be saved to history",
      });
    }
    return null;
  }
}

/**
 * Verify an asset exists in the database
 */
export async function verifyAssetExists(imageUrl: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('generated_assets')
      .select('id')
      .eq('user_id', user.id)
      .eq('image_url', imageUrl)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Ensure asset is saved (save if not exists)
 */
export async function ensureAssetSaved(options: SaveAssetOptions): Promise<string | null> {
  const exists = await verifyAssetExists(options.imageUrl);
  if (exists) {
    return null; // Already saved
  }
  return saveAsset(options);
}

