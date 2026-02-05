/**
 * Prompt Engine
 * Structured, versioned, compositional prompt system
 * 
 * This is NOT a string builder. It is a compositional system.
 */

import type { GenerationParams, NormalizedGenerationParams } from './generationParams.ts';

export interface PromptSection {
  key: string;
  content: string;
  priority: number; // Lower = higher priority
}

export interface PromptObject {
  version: string;
  sections: Record<string, string>;
  ordered_keys: string[];
  metadata: {
    aspect_ratio: string;
    quality: string;
    background_mode: string;
    has_reference: boolean;
    has_brand_context: boolean;
  };
}

export interface NegativePromptObject {
  version: string;
  sections: Record<string, string>;
  ordered_keys: string[];
}

const PROMPT_VERSION = "v1.0.0";

/**
 * Builds a structured prompt object from generation parameters
 */
export function buildPrompt(params: NormalizedGenerationParams): PromptObject {
  const sections: Record<string, string> = {};
  const orderedKeys: string[] = [];

  // Core Intent (highest priority)
  sections.core_intent = params.prompt;
  orderedKeys.push('core_intent');

  // Visual Description (if different from core intent, or if we have style tags)
  if (params.style_tags && params.style_tags.length > 0) {
    sections.visual_description = `Style: ${params.style_tags.join(', ')}`;
    orderedKeys.push('visual_description');
  }

  // Style & Medium
  if (params.realism_level) {
    sections.style_medium = `Realism level: ${params.realism_level}`;
    orderedKeys.push('style_medium');
  }

  // Composition & Framing
  sections.composition = `Aspect ratio: ${params.aspect_ratio} (${params.width}x${params.height})`;
  orderedKeys.push('composition');

  // Lighting & Texture
  if (params.lighting) {
    sections.lighting = `Lighting: ${params.lighting}`;
    orderedKeys.push('lighting');
  }

  // Quality Constraints
  const qualityDescriptions: Record<string, string> = {
    high: 'Ultra-premium, award-winning quality. Maximum detail, perfect sharpness, professional color grading.',
    standard: 'Professional commercial quality. High detail, excellent sharpness, polished finish.',
  };
  sections.quality = qualityDescriptions[params.quality] || qualityDescriptions.standard;
  orderedKeys.push('quality');

  // Background
  if (params.background_mode === 'transparent') {
    sections.background = 'Perfect transparent background with clean edges, no halos or artifacts';
  } else if (params.background_mode === 'solid') {
    sections.background = 'Professionally composed solid background that enhances the subject';
  } else {
    sections.background = 'Intelligently chosen background that serves the creative vision';
  }
  orderedKeys.push('background');

  // Brand / Context (optional)
  if (params.brand_context) {
    const brandParts: string[] = [];
    if (params.brand_context.color_palette && params.brand_context.color_palette.length > 0) {
      brandParts.push(`Brand colors: ${params.brand_context.color_palette.join(', ')}`);
    }
    if (params.brand_context.usage_rules?.imageryStyle) {
      brandParts.push(`Brand style: ${params.brand_context.usage_rules.imageryStyle}`);
    }
    if (brandParts.length > 0) {
      sections.brand_context = brandParts.join('. ');
      orderedKeys.push('brand_context');
    }
  }

  // Reference Image Context (if present)
  if (params.reference_image_url) {
    const strength = params.continuation_strength ?? 1.0;
    let contextInstructions = '';
    
    if (strength <= 0.3) {
      contextInstructions = `CRITICAL: This is a MINOR REFINEMENT. Preserve nearly everything from the reference image.
1. Keep the EXACT same subject, composition, framing, and perspective
2. Maintain the EXACT same artistic style, technique, and mood
3. Preserve the EXACT same color palette and lighting setup
4. Only make MINIMAL changes as explicitly mentioned: ${params.prompt}
5. If unclear what to change, keep everything identical to the reference`;
    } else if (strength <= 0.6) {
      contextInstructions = `IMPORTANT: This is a MODERATE REFINEMENT. Balance preservation with intentional changes.
1. Keep the core subject, general composition, and framing
2. Maintain the overall artistic style and mood
3. Preserve the general color palette unless explicitly changed
4. Apply these specific changes while keeping context: ${params.prompt}
5. Ensure changes feel natural and cohesive with the original`;
    } else if (strength <= 0.8) {
      contextInstructions = `NOTE: This is a MAJOR REVISION. Make significant changes while maintaining some visual connection.
1. Transform based on: ${params.prompt}
2. You may alter composition, style, and colors as needed
3. Keep some recognizable elements from the reference if appropriate
4. Prioritize the new vision while honoring the reference's essence`;
    } else {
      contextInstructions = `This is a FRESH GENERATION inspired by the reference.
Create: ${params.prompt}
Use the reference image only as loose inspiration for general style or mood, but feel free to create something entirely new.`;
    }

    if (params.previous_prompt) {
      contextInstructions += `\n\nPrevious prompt was: "${params.previous_prompt}"`;
    }

    sections.reference_context = contextInstructions;
    orderedKeys.push('reference_context');
  }

  return {
    version: PROMPT_VERSION,
    sections,
    ordered_keys: orderedKeys,
    metadata: {
      aspect_ratio: params.aspect_ratio,
      quality: params.quality,
      background_mode: params.background_mode,
      has_reference: !!params.reference_image_url,
      has_brand_context: !!params.brand_context,
    },
  };
}

/**
 * Builds a negative prompt from generation parameters
 */
export function buildNegativePrompt(params: NormalizedGenerationParams): NegativePromptObject {
  const sections: Record<string, string> = {};
  const orderedKeys: string[] = [];

  // Base negative constraints
  sections.base = 'blurry, low quality, distorted, artifacts, noise, watermark, text, signature';
  orderedKeys.push('base');

  // Quality-specific negatives
  if (params.quality === 'high') {
    sections.quality = 'compression artifacts, pixelation, banding, color shifts';
    orderedKeys.push('quality');
  }

  // Background-specific negatives
  if (params.background_mode === 'transparent') {
    sections.background = 'halos, edge artifacts, background remnants, color bleeding';
    orderedKeys.push('background');
  }

  // Custom negative prompt if provided
  if (params.negative_prompt) {
    sections.custom = params.negative_prompt;
    orderedKeys.push('custom');
  }

  return {
    version: PROMPT_VERSION,
    sections,
    ordered_keys: orderedKeys,
  };
}

/**
 * Serializes a prompt object into a single string for AI consumption
 */
export function serializePrompt(promptObject: PromptObject): string {
  // For reference images, return the reference context directly (it contains the full instructions)
  if (promptObject.sections.reference_context) {
    return promptObject.sections.reference_context;
  }

  // For standard generation, build a professional prompt
  const parts: string[] = [];

  parts.push(`You are a world-class commercial photographer and creative director working for top-tier advertising agencies. Your work appears in Vogue, National Geographic, and award-winning campaigns.

TASK: Create a stunning, publication-ready image that would impress the most demanding creative directors and art buyers.

PROFESSIONAL STANDARDS:
1. **Award-Winning Composition**: Master-level composition using rule of thirds, golden ratio, leading lines, and perfect visual balance. Every element placed with intention.
2. **Commercial Photography Quality**: Studio-grade lighting, perfect exposure, razor-sharp focus, and professional depth of field. Image quality suitable for billboards and print campaigns.
3. **Art Direction Excellence**: Sophisticated color grading, harmonious color palettes, and visual hierarchy that guides the eye naturally through the image.
4. **Detail & Craftsmanship**: Ultra-high detail, realistic textures, perfect rendering. Every pixel crafted to perfection. No artifacts, no imperfections.
5. **Brand-Ready Aesthetics**: Image quality that agencies would confidently present to Fortune 500 clients. Polished, refined, and commercially viable.
6. **Aspect Ratio Optimization**: Composition expertly designed for ${promptObject.metadata.aspect_ratio} format, maximizing visual impact within these dimensions.

CREATIVE EXECUTION:
- Analyze the core creative intent: What story does this image tell? What emotion should it evoke?
- Determine the optimal visual style: Is this editorial, commercial, artistic, or documentary? Execute accordingly.
- Master lighting design: Natural light, studio lighting, or dramatic lighting - choose and execute flawlessly.
- Color psychology: Select colors that enhance the message, mood, and brand positioning.
- Composition mastery: Arrange elements for maximum visual impact, ensuring nothing distracts from the main subject.
- Professional polish: Every detail refined to perfection - shadows, highlights, midtones all balanced expertly.

QUALITY SPECIFICATIONS:
- Resolution: Maximum detail, suitable for large format printing
- Sharpness: Professional-grade sharpness throughout, with appropriate depth of field
- Color Accuracy: Perfect color reproduction, suitable for professional color grading
- Artifact-Free: Zero compression artifacts, noise, or imperfections
- Background: ${promptObject.sections.background || 'Intelligently chosen background that serves the creative vision'}

OUTPUT REQUIREMENT:
Generate a single, world-class image that would win awards at Cannes Lions, D&AD, or One Show. This image should be portfolio-worthy and suitable for premium brand campaigns.

Aspect ratio: ${promptObject.metadata.aspect_ratio}
Quality tier: ${promptObject.sections.quality || 'Professional commercial quality'}

CREATIVE BRIEF: ${promptObject.sections.core_intent}

Now create this image with the skill and artistry of a world-renowned commercial photographer.`);

  return parts.join('\n\n');
}

/**
 * Serializes a negative prompt object into a single string
 */
export function serializeNegativePrompt(negativePromptObject: NegativePromptObject): string {
  return negativePromptObject.ordered_keys
    .map(key => negativePromptObject.sections[key])
    .join(', ');
}
