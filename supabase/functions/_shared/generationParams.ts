/**
 * Generation Parameters Contract
 * Single source of truth for all image generation parameters
 * 
 * NON-NEGOTIABLE: Every parameter must be validated, used, stored, and observable
 */

export type AspectRatio = "1:1" | "4:5" | "16:9" | "9:16" | "3:2" | "2:3";
export type BackgroundMode = "transparent" | "solid" | "original";
export type Quality = "standard" | "high";
export type Lighting = "soft" | "studio" | "dramatic";
export type RealismLevel = "illustrative" | "photoreal";

export interface GenerationParams {
  // Required core params
  prompt: string;
  aspect_ratio: AspectRatio;
  background_mode: BackgroundMode;
  quality: Quality;
  
  // Optional core params
  seed?: number;
  guidance_scale?: number;
  steps?: number;
  
  // Optional advanced params
  negative_prompt?: string;
  style_tags?: string[];
  color_palette?: string[];
  lighting?: Lighting;
  realism_level?: RealismLevel;
  brand_context?: {
    brand_kit_id?: string;
    color_palette?: string[];
    usage_rules?: Record<string, unknown>;
  };
  
  // Reference image params
  reference_image_url?: string;
  continuation_strength?: number;
  previous_prompt?: string;
}

export interface NormalizedGenerationParams extends GenerationParams {
  // Normalized values (always present)
  seed: number;
  guidance_scale: number;
  steps: number;
  width: number;
  height: number;
}

/**
 * Default values for generation parameters
 */
export function getGenerationDefaults(): Partial<NormalizedGenerationParams> {
  return {
    seed: Math.floor(Math.random() * 1000000),
    guidance_scale: 7.5,
    steps: 50,
    quality: "standard",
    background_mode: "original",
    aspect_ratio: "1:1",
  };
}

/**
 * Aspect ratio to dimensions mapping
 */
export const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:5": { width: 1024, height: 1280 },
  "16:9": { width: 1536, height: 864 },
  "9:16": { width: 864, height: 1536 },
  "3:2": { width: 1536, height: 1024 },
  "2:3": { width: 1024, height: 1536 },
};

/**
 * Legacy size string to aspect ratio mapping (for backward compatibility)
 */
export const SIZE_TO_ASPECT_RATIO: Record<string, AspectRatio> = {
  "1024x1024": "1:1",
  "1536x1024": "3:2",
  "1024x1536": "2:3",
};

/**
 * Validates generation parameters
 * Rejects unknown keys and invalid values
 */
export function validateGenerationParams(input: unknown): {
  valid: boolean;
  error?: string;
  params?: GenerationParams;
} {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid input: must be an object' };
  }

  const obj = input as Record<string, unknown>;
  const errors: string[] = [];

  // Validate required fields
  if (!obj.prompt || typeof obj.prompt !== 'string') {
    errors.push('prompt is required and must be a string');
  } else {
    const prompt = obj.prompt.trim();
    if (prompt.length < 3) {
      errors.push('prompt must be at least 3 characters');
    }
    if (prompt.length > 2000) {
      errors.push('prompt must be at most 2000 characters');
    }
  }

  // Validate aspect_ratio
  const validAspectRatios: AspectRatio[] = ["1:1", "4:5", "16:9", "9:16", "3:2", "2:3"];
  if (!obj.aspect_ratio || !validAspectRatios.includes(obj.aspect_ratio as AspectRatio)) {
    // Try to convert from legacy size format
    if (obj.size && typeof obj.size === 'string' && SIZE_TO_ASPECT_RATIO[obj.size]) {
      obj.aspect_ratio = SIZE_TO_ASPECT_RATIO[obj.size];
    } else {
      errors.push(`aspect_ratio must be one of: ${validAspectRatios.join(', ')}`);
    }
  }

  // Validate background_mode
  const validBackgroundModes: BackgroundMode[] = ["transparent", "solid", "original"];
  if (!obj.background_mode || !validBackgroundModes.includes(obj.background_mode as BackgroundMode)) {
    // Try to convert from legacy background format
    if (obj.background && typeof obj.background === 'string') {
      if (obj.background === 'transparent' || obj.background === 'auto') {
        obj.background_mode = 'transparent';
      } else if (obj.background === 'opaque' || obj.background === 'solid') {
        obj.background_mode = 'solid';
      } else {
        obj.background_mode = 'original';
      }
    } else {
      errors.push(`background_mode must be one of: ${validBackgroundModes.join(', ')}`);
    }
  }

  // Validate quality
  const validQualities: Quality[] = ["standard", "high"];
  if (!obj.quality || !validQualities.includes(obj.quality as Quality)) {
    // Try to convert from legacy quality format
    if (obj.quality === 'auto' || obj.quality === 'medium' || obj.quality === 'low') {
      obj.quality = 'standard';
    } else if (obj.quality === 'high') {
      obj.quality = 'high';
    } else {
      errors.push(`quality must be one of: ${validQualities.join(', ')}`);
    }
  }

  // Validate optional numeric params
  if (obj.seed !== undefined) {
    if (typeof obj.seed !== 'number' || obj.seed < 0 || obj.seed > 2147483647) {
      errors.push('seed must be a number between 0 and 2147483647');
    }
  }

  if (obj.guidance_scale !== undefined) {
    if (typeof obj.guidance_scale !== 'number' || obj.guidance_scale < 1 || obj.guidance_scale > 20) {
      errors.push('guidance_scale must be a number between 1 and 20');
    }
  }

  if (obj.steps !== undefined) {
    if (typeof obj.steps !== 'number' || obj.steps < 10 || obj.steps > 100) {
      errors.push('steps must be a number between 10 and 100');
    }
  }

  // Validate optional string params
  if (obj.negative_prompt !== undefined && typeof obj.negative_prompt !== 'string') {
    errors.push('negative_prompt must be a string');
  }

  if (obj.style_tags !== undefined) {
    if (!Array.isArray(obj.style_tags) || !obj.style_tags.every(tag => typeof tag === 'string')) {
      errors.push('style_tags must be an array of strings');
    }
  }

  if (obj.color_palette !== undefined) {
    if (!Array.isArray(obj.color_palette) || !obj.color_palette.every(color => typeof color === 'string')) {
      errors.push('color_palette must be an array of strings');
    }
  }

  if (obj.lighting !== undefined) {
    const validLighting: Lighting[] = ["soft", "studio", "dramatic"];
    if (!validLighting.includes(obj.lighting as Lighting)) {
      errors.push(`lighting must be one of: ${validLighting.join(', ')}`);
    }
  }

  if (obj.realism_level !== undefined) {
    const validRealism: RealismLevel[] = ["illustrative", "photoreal"];
    if (!validRealism.includes(obj.realism_level as RealismLevel)) {
      errors.push(`realism_level must be one of: ${validRealism.join(', ')}`);
    }
  }

  // Validate reference image params
  if (obj.reference_image_url !== undefined && typeof obj.reference_image_url !== 'string') {
    errors.push('reference_image_url must be a string');
  }

  if (obj.continuation_strength !== undefined) {
    if (typeof obj.continuation_strength !== 'number' || obj.continuation_strength < 0 || obj.continuation_strength > 1) {
      errors.push('continuation_strength must be a number between 0 and 1');
    }
  }

  if (obj.previous_prompt !== undefined && typeof obj.previous_prompt !== 'string') {
    errors.push('previous_prompt must be a string');
  }

  // Check for unknown keys (strict validation)
  const allowedKeys = new Set([
    'prompt', 'aspect_ratio', 'background_mode', 'quality',
    'seed', 'guidance_scale', 'steps',
    'negative_prompt', 'style_tags', 'color_palette', 'lighting', 'realism_level', 'brand_context',
    'reference_image_url', 'continuation_strength', 'previous_prompt',
    // Legacy keys (for backward compatibility during migration)
    'size', 'background'
  ]);

  const unknownKeys = Object.keys(obj).filter(key => !allowedKeys.has(key));
  if (unknownKeys.length > 0) {
    errors.push(`Unknown parameters: ${unknownKeys.join(', ')}`);
  }

  if (errors.length > 0) {
    return { valid: false, error: errors.join('; ') };
  }

  // Build validated params object
  const params: GenerationParams = {
    prompt: (obj.prompt as string).trim(),
    aspect_ratio: obj.aspect_ratio as AspectRatio,
    background_mode: obj.background_mode as BackgroundMode,
    quality: obj.quality as Quality,
    ...(obj.seed !== undefined && { seed: obj.seed as number }),
    ...(obj.guidance_scale !== undefined && { guidance_scale: obj.guidance_scale as number }),
    ...(obj.steps !== undefined && { steps: obj.steps as number }),
    ...(obj.negative_prompt !== undefined && { negative_prompt: obj.negative_prompt as string }),
    ...(obj.style_tags !== undefined && { style_tags: obj.style_tags as string[] }),
    ...(obj.color_palette !== undefined && { color_palette: obj.color_palette as string[] }),
    ...(obj.lighting !== undefined && { lighting: obj.lighting as Lighting }),
    ...(obj.realism_level !== undefined && { realism_level: obj.realism_level as RealismLevel }),
    ...(obj.brand_context !== undefined && { brand_context: obj.brand_context as GenerationParams['brand_context'] }),
    ...(obj.reference_image_url !== undefined && { reference_image_url: obj.reference_image_url as string }),
    ...(obj.continuation_strength !== undefined && { continuation_strength: obj.continuation_strength as number }),
    ...(obj.previous_prompt !== undefined && { previous_prompt: obj.previous_prompt as string }),
  };

  return { valid: true, params };
}

/**
 * Normalizes generation parameters with defaults
 * Returns a fully populated NormalizedGenerationParams object
 */
export function normalizeGenerationParams(input: GenerationParams): NormalizedGenerationParams {
  const defaults = getGenerationDefaults();
  const dimensions = ASPECT_RATIO_DIMENSIONS[input.aspect_ratio];

  return {
    ...input,
    seed: input.seed ?? defaults.seed!,
    guidance_scale: input.guidance_scale ?? defaults.guidance_scale!,
    steps: input.steps ?? defaults.steps!,
    width: dimensions.width,
    height: dimensions.height,
  };
}
