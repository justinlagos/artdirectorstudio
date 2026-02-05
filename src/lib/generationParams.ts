/**
 * Generation Parameters Utility
 * Converts frontend GenerationOptions to backend format
 */

import type { GenerationOptions } from "@/components/ImageGenerationDialog";

/**
 * Converts GenerationOptions to backend API format
 */
export function convertToBackendFormat(options: GenerationOptions): Record<string, unknown> {
  // Convert aspect ratio
  const aspectRatio = options.aspectRatio || 
    (options.size === "1024x1024" ? "1:1" : 
     options.size === "1536x1024" ? "3:2" : 
     options.size === "1024x1536" ? "2:3" : 
     "1:1");

  // Convert background mode
  const backgroundMode = options.background === "transparent" 
    ? "transparent" 
    : options.background === "opaque" 
    ? "solid" 
    : "original";

  // Normalize quality
  const quality = options.quality === "high" 
    ? "high" 
    : options.quality === "low" 
    ? "standard" 
    : options.quality === "medium" 
    ? "standard" 
    : "standard";

  const backendParams = {
    // New format (preferred)
    aspect_ratio: aspectRatio,
    background_mode: backgroundMode,
    quality: quality,
    // Legacy fields for backward compatibility
    size: options.size,
    background: options.background,
    reference_image_url: options.referenceImageUrl,
    continuation_strength: options.continuationStrength,
    previous_prompt: options.previousPrompt,
  };

  // Log for verification (remove in production if needed)
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    console.log('[GenerationParams] Converted to backend format:', {
      input: options,
      output: backendParams,
    });
  }

  return backendParams;
}
