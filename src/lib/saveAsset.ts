/**
 * Unified Asset Saving Utility
 * Ensures all generated/edited images are saved to generated_assets table
 * This is the single source of truth for saving assets
 * Handles storage upload for base64/data URLs with robust error handling
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
 * Verifies upload success before returning
 */
async function ensureImageInStorage(
  imageInput: string | Blob,
  action: string,
  userId: string
): Promise<string> {
  console.log('[SaveAsset] Ensuring image in storage', { action, userId, inputType: imageInput instanceof Blob ? 'Blob' : typeof imageInput });
  
  // If it's already a URL, verify it's accessible and return it
  if (typeof imageInput === 'string' && (imageInput.startsWith('http://') || imageInput.startsWith('https://'))) {
    console.log('[SaveAsset] Image is already a URL, verifying accessibility:', imageInput.substring(0, 100));
    // Verify URL is accessible
    try {
      const response = await fetch(imageInput, { method: 'HEAD', mode: 'no-cors' });
      // If no-cors, we can't check status, but if it doesn't throw, it's likely valid
      console.log('[SaveAsset] URL appears accessible');
    } catch (verifyError) {
      console.warn('[SaveAsset] URL verification failed, but continuing:', verifyError);
    }
    return imageInput;
  }

  // Convert to blob if needed
  let blob: Blob;
  try {
    if (imageInput instanceof Blob) {
      blob = imageInput;
      console.log('[SaveAsset] Input is already a Blob, size:', blob.size);
    } else if (typeof imageInput === 'string' && imageInput.startsWith('data:')) {
      // Base64 data URL
      console.log('[SaveAsset] Converting data URL to Blob');
      const response = await fetch(imageInput);
      if (!response.ok) {
        throw new Error(`Failed to fetch data URL: ${response.status}`);
      }
      blob = await response.blob();
      console.log('[SaveAsset] Converted to Blob, size:', blob.size);
    } else {
      throw new Error(`Invalid image input format: ${typeof imageInput}`);
    }
  } catch (conversionError) {
    console.error('[SaveAsset] Failed to convert image input to Blob:', conversionError);
    throw new Error(`Image conversion failed: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
  }

  if (!blob || blob.size === 0) {
    throw new Error('Image blob is empty');
  }

  // Upload to storage with proper path structure for RLS
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const uuid = crypto.randomUUID();
  const fileName = `${userId}/${action}/${yearMonth}/${uuid}.png`;

  console.log('[SaveAsset] Uploading to storage:', fileName);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('generated-images')
    .upload(fileName, blob, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    console.warn('[SaveAsset] Primary upload failed, trying alternative path:', {
      error: uploadError.message,
      fileName
    });
    
    const altFileName = `${userId}/${action}/${uuid}.png`;
    console.log('[SaveAsset] Attempting alternative upload:', altFileName);
    
    const { data: altUploadData, error: altError } = await supabase.storage
      .from('generated-images')
      .upload(altFileName, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (altError) {
      // Both uploads failed - this is a critical error
      console.error('[SaveAsset] Storage upload failed completely:', {
        primaryError: uploadError.message,
        altError: altError.message,
        fileName,
        altFileName
      });
      throw new Error(`Storage upload failed: ${altError.message}`);
    }

    // Verify alternative upload succeeded
    if (!altUploadData || !altUploadData.path) {
      throw new Error('Alternative upload succeeded but no data returned');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('generated-images')
      .getPublicUrl(altFileName);
    
    if (!publicUrl) {
      throw new Error('Failed to get public URL for uploaded image');
    }
    
    console.log('[SaveAsset] Alternative upload successful, public URL:', publicUrl.substring(0, 100));
    return publicUrl;
  }

  // Verify primary upload succeeded
  if (!uploadData || !uploadData.path) {
    throw new Error('Upload succeeded but no data returned');
  }

  const { data: { publicUrl } } = supabase.storage
    .from('generated-images')
    .getPublicUrl(fileName);
  
  if (!publicUrl) {
    throw new Error('Failed to get public URL for uploaded image');
  }
  
  console.log('[SaveAsset] Primary upload successful, public URL:', publicUrl.substring(0, 100));
  return publicUrl;
}

/**
 * Save an asset to generated_assets table
 * This is the unified save function used by all tools
 * Provides robust error handling with detailed logging and user feedback
 */
export async function saveAsset(options: SaveAssetOptions): Promise<string | null> {
  const startTime = Date.now();
  console.log('[SaveAsset] Starting save operation', {
    action: options.action,
    hasImageUrl: !!options.imageUrl,
    imageUrlType: options.imageUrl instanceof Blob ? 'Blob' : typeof options.imageUrl,
    hasPrompt: !!options.prompt,
    skipToast: options.skipToast
  });

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('[SaveAsset] Failed to get user:', userError);
      const errorMsg = 'Authentication error. Please sign in again.';
      // Always show critical auth errors even if skipToast is true
      toast.error("Failed to save", {
        description: errorMsg,
      });
      return null;
    }
    
    if (!user) {
      console.error('[SaveAsset] No user found');
      const errorMsg = 'Please sign in to save your work.';
      // Always show critical auth errors even if skipToast is true
      toast.error("Failed to save", {
        description: errorMsg,
      });
      return null;
    }

    console.log('[SaveAsset] User authenticated:', user.id);

    // Ensure image is in storage and get public URL
    // CRITICAL: Verify storage upload success before database insert
    let publicImageUrl: string;
    try {
      publicImageUrl = await ensureImageInStorage(options.imageUrl, options.action, user.id);
      console.log('[SaveAsset] Storage verification complete:', {
        url: publicImageUrl.substring(0, 100),
        urlLength: publicImageUrl.length
      });
    } catch (storageError) {
      // Storage upload failed - this is a critical error
      const errorMessage = storageError instanceof Error ? storageError.message : 'Unknown storage error';
      console.error('[SaveAsset] Storage upload failed:', {
        error: errorMessage,
        imageUrlType: options.imageUrl instanceof Blob ? 'Blob' : typeof options.imageUrl,
        stack: storageError instanceof Error ? storageError.stack : undefined
      });
      
      // If storage fails but we have a URL string, use it directly as fallback
      if (typeof options.imageUrl === 'string' && options.imageUrl.startsWith('http')) {
        console.warn('[SaveAsset] Storage failed, using provided URL directly as fallback');
        publicImageUrl = options.imageUrl;
      } else {
        // Critical error - always show toast even if skipToast is true
        toast.error("Failed to save image", {
          description: "Could not upload image to storage. Please try again.",
          duration: 5000
        });
        return null;
      }
    }

    // Verify publicImageUrl is valid
    if (!publicImageUrl || typeof publicImageUrl !== 'string' || publicImageUrl.trim() === '') {
      console.error('[SaveAsset] Invalid public image URL after storage verification');
      const errorMsg = 'Invalid image URL. Please try again.';
      // Always show critical errors even if skipToast is true
      toast.error("Failed to save", {
        description: errorMsg,
      });
      return null;
    }

    // Check if asset already exists (by URL)
    let existingAssetId: string | null = null;
    try {
      const { data: existing, error: checkError } = await supabase
        .from('generated_assets')
        .select('id')
        .eq('user_id', user.id)
        .eq('image_url', publicImageUrl)
        .maybeSingle();

      if (checkError) {
        console.warn('[SaveAsset] Existence check error (non-fatal), continuing:', {
          error: checkError.message,
          code: checkError.code
        });
        // Continue to insert - might be RLS issue or network error
      } else if (existing) {
        existingAssetId = existing.id;
        console.log('[SaveAsset] Asset already exists:', existing.id);
      }
    } catch (checkError) {
      console.warn('[SaveAsset] Existence check exception (non-fatal), continuing:', checkError);
      // Continue to insert anyway
    }

    // If asset already exists, return its ID
    if (existingAssetId) {
      console.log('[SaveAsset] Returning existing asset ID:', existingAssetId);
      // Invalidate queries to ensure UI is up to date
      if (options.queryClient) {
        const userId = options.userId || user.id;
        options.queryClient.invalidateQueries({
          queryKey: ['generated_assets', userId],
        });
        console.log('[SaveAsset] Invalidated queries for existing asset');
      }
      return existingAssetId;
    }

    // Insert new asset - only after storage verification succeeds
    const paramsJson = options.params ? (options.params as any) : null;
    const analysisJson = options.analysisData ? (options.analysisData as any) : null;
    
    console.log('[SaveAsset] Inserting new asset to database', {
      userId: user.id,
      action: options.action,
      hasImageUrl: !!publicImageUrl,
      hasPrompt: !!options.prompt,
      hasParams: !!paramsJson,
      hasAnalysis: !!analysisJson
    });

    const { data: assetData, error: dbError } = await supabase
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

    if (dbError) {
      // Database error - this is critical and should be reported
      console.error('[SaveAsset] Database insert error:', {
        error: dbError.message,
        code: dbError.code,
        details: dbError.details,
        hint: dbError.hint,
        userId: user.id,
        imageUrl: publicImageUrl.substring(0, 100)
      });
      
      // Always show critical database errors even if skipToast is true
      const errorMsg = dbError.code === '23505' 
        ? 'This image is already saved to My Projects.'
        : dbError.message || 'Failed to save to database. Please try again.';
      
      toast.error("Failed to save", {
        description: errorMsg,
        duration: 5000
      });
      return null;
    }

    if (!assetData || !assetData.id) {
      console.error('[SaveAsset] Database insert succeeded but no data returned');
      const errorMsg = 'Save operation completed but asset not found. Please refresh My Projects.';
      // Always show critical errors even if skipToast is true
      toast.error("Save incomplete", {
        description: errorMsg,
      });
      return null;
    }

    const duration = Date.now() - startTime;
    console.log('[SaveAsset] Asset saved successfully:', {
      assetId: assetData.id,
      duration: `${duration}ms`,
      imageUrl: assetData.image_url?.substring(0, 100),
      hasImageUrl: !!assetData.image_url
    });

    // Show success toast unless explicitly skipped
    if (!options.skipToast) {
      toast.success("Saved to My Projects", {
        description: "Your image has been added to your project history",
      });
    }
    
    // Invalidate queries to refresh History page immediately
    if (options.queryClient) {
      const userId = options.userId || user.id;
      options.queryClient.invalidateQueries({
        queryKey: ['generated_assets', userId],
      });
      console.log('[SaveAsset] Invalidated queries for user:', userId);
    }
    
    return assetData.id;
  } catch (error) {
    // Catch-all for unexpected errors
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[SaveAsset] Unexpected error saving asset:', {
      error: errorMessage,
      stack: errorStack,
      duration: `${duration}ms`,
      action: options.action
    });
    
    // Always show critical unexpected errors even if skipToast is true
    toast.error("Failed to save", {
      description: "An unexpected error occurred. Please try again or contact support if the issue persists.",
      duration: 5000
    });
    
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
 * Provides explicit error handling and logging
 */
export async function ensureAssetSaved(options: SaveAssetOptions): Promise<string | null> {
  console.log('[SaveAsset] Ensuring asset saved', {
    action: options.action,
    imageUrlType: options.imageUrl instanceof Blob ? 'Blob' : typeof options.imageUrl,
    hasPrompt: !!options.prompt
  });

  try {
    // If imageUrl is a string URL, check if it exists
    if (typeof options.imageUrl === 'string' && options.imageUrl.startsWith('http')) {
      console.log('[SaveAsset] Checking if asset already exists for URL:', options.imageUrl.substring(0, 100));
      const exists = await verifyAssetExists(options.imageUrl);
      if (exists) {
        console.log('[SaveAsset] Asset already exists, skipping save');
        return null; // Already saved - this is not an error
      }
      console.log('[SaveAsset] Asset does not exist, proceeding with save');
    }
    
    // For base64/blob, always try to save (will check during save)
    console.log('[SaveAsset] Proceeding to save asset');
    const assetId = await saveAsset(options);
    
    if (assetId) {
      console.log('[SaveAsset] Asset ensured and saved:', assetId);
    } else {
      console.warn('[SaveAsset] Asset save returned null - may have failed or already existed');
    }
    
    return assetId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SaveAsset] Error in ensureAssetSaved:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      action: options.action
    });
    
    // Re-throw to allow caller to handle
    throw error;
  }
}

