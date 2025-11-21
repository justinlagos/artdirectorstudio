/**
 * Unified Asset Saving Utility
 * Ensures all generated/edited images are saved to generated_assets table
 * This is the single source of truth for saving assets
 * Handles storage upload for base64/data URLs and RLS errors silently
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { QueryClient } from "@tanstack/react-query";

export interface SaveAssetOptions {
  imageUrl: string | Blob; // Can be URL string, base64 data URL, or Blob
  action: 'generate' | 'edit' | 'upscale' | 'blend' | 'batch_analyze' | 'batch_upscale' | 'batch_blend';
  prompt?: string;
  sourceUrls?: string[];
  params?: Record<string, unknown>;
  analysisData?: Record<string, unknown>;
  durationMs?: number;
  skipToast?: boolean;
  queryClient?: QueryClient; // Optional QueryClient for query invalidation
  userId?: string; // Optional userId for query invalidation
}

/**
 * Upload image to storage if needed (base64/blob) and return public URL
 */
async function ensureImageInStorage(
  imageInput: string | Blob,
  action: string,
  userId: string
): Promise<string> {
  // If it's already a URL, return it
  if (typeof imageInput === 'string' && (imageInput.startsWith('http://') || imageInput.startsWith('https://'))) {
    return imageInput;
  }

  // Convert to blob if needed
  let blob: Blob;
  if (imageInput instanceof Blob) {
    blob = imageInput;
  } else if (typeof imageInput === 'string' && imageInput.startsWith('data:')) {
    // Base64 data URL
    const response = await fetch(imageInput);
    blob = await response.blob();
  } else {
    throw new Error('Invalid image input format');
  }

  // Upload to storage with proper path structure for RLS
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const uuid = crypto.randomUUID();
  const fileName = `${userId}/${action}/${yearMonth}/${uuid}.png`;

  const { error: uploadError } = await supabase.storage
    .from('generated-images')
    .upload(fileName, blob, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    // Silently handle RLS/storage errors - try alternative path
    console.warn('[SaveAsset] Storage upload failed, trying alternative:', uploadError.message);
    const altFileName = `${userId}/${action}/${uuid}.png`;
    const { error: altError } = await supabase.storage
      .from('generated-images')
      .upload(altFileName, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (altError) {
      // If both fail, throw but log silently
      console.error('[SaveAsset] Storage upload failed completely:', altError.message);
      throw new Error('Storage upload failed');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('generated-images')
      .getPublicUrl(altFileName);
    return publicUrl;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('generated-images')
    .getPublicUrl(fileName);
  return publicUrl;
}

/**
 * Save an asset to generated_assets table
 * This is the unified save function used by all tools
 * Handles RLS errors silently and retries with fallback
 */
export async function saveAsset(options: SaveAssetOptions): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[SaveAsset] No user found');
      return null;
    }

    // Ensure image is in storage and get public URL
    let publicImageUrl: string;
    try {
      publicImageUrl = await ensureImageInStorage(options.imageUrl, options.action, user.id);
    } catch (storageError) {
      // If storage fails but we have a URL string, use it directly
      if (typeof options.imageUrl === 'string' && options.imageUrl.startsWith('http')) {
        console.warn('[SaveAsset] Storage failed, using provided URL directly');
        publicImageUrl = options.imageUrl;
      } else {
        console.error('[SaveAsset] Storage error:', storageError);
        if (!options.skipToast) {
          toast.error("Failed to save image", {
            description: "Could not upload image to storage",
          });
        }
        return null;
      }
    }

    // Check if asset already exists (by URL)
    try {
      const { data: existing } = await supabase
        .from('generated_assets')
        .select('id')
        .eq('user_id', user.id)
        .eq('image_url', publicImageUrl)
        .maybeSingle();

      if (existing) {
        console.log('[SaveAsset] Asset already exists:', existing.id);
        return existing.id;
      }
    } catch (checkError) {
      // Silently continue if check fails - might be RLS issue, try insert anyway
      console.warn('[SaveAsset] Existence check failed, continuing:', checkError);
    }

    // Insert new asset
    const paramsJson = options.params ? (options.params as any) : null;
    const analysisJson = options.analysisData ? (options.analysisData as any) : null;
    
    let assetData;
    let dbError;
    
    try {
      const { data, error } = await supabase
        .from('generated_assets')
        .insert([{
          user_id: user.id,
          type: 'image' as const,
          action: options.action,
          image_url: publicImageUrl,
          prompt: options.prompt || `${options.action} image`,
          source_urls: options.sourceUrls || null,
          params: paramsJson,
          analysis_data: analysisJson,
          duration_ms: options.durationMs || null,
        }])
        .select()
        .single();

      assetData = data;
      dbError = error;
    } catch (insertError) {
      // Handle RLS or other DB errors silently
      console.error('[SaveAsset] Database insert error:', insertError);
      dbError = insertError as any;
    }

    if (dbError) {
      // Silently handle RLS/DB errors - log but don't throw
      console.error('[SaveAsset] Database error (silent):', dbError);
      // Don't show error toast - operation may have succeeded on backend
      return null;
    }

    if (assetData) {
      console.log('[SaveAsset] Asset saved successfully:', assetData.id);
      if (!options.skipToast) {
        toast.success("Saved to My Projects", {
          description: "Your image has been added to your project history",
        });
      }
      
      // Invalidate queries to refresh History page immediately
      if (options.queryClient && (options.userId || user.id)) {
        const userId = options.userId || user.id;
        options.queryClient.invalidateQueries({
          queryKey: ['generated_assets', userId],
        });
        console.log('[SaveAsset] Invalidated queries for user:', userId);
      }
      
      return assetData.id;
    }

    return null;
  } catch (error) {
    // Silently handle all errors - don't disrupt user workflow
    console.error('[SaveAsset] Error saving asset (silent):', error);
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
 * Handles both URL strings and base64/blob inputs
 */
export async function ensureAssetSaved(options: SaveAssetOptions): Promise<string | null> {
  // If imageUrl is a string URL, check if it exists
  if (typeof options.imageUrl === 'string' && options.imageUrl.startsWith('http')) {
    const exists = await verifyAssetExists(options.imageUrl);
    if (exists) {
      return null; // Already saved
    }
  }
  // For base64/blob, always try to save (will check during save)
  return saveAsset(options);
}

