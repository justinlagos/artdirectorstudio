/**
 * Prompt Intelligence Layer
 * 
 * Context-Locked Prompt Synthesis that combines:
 * - User prompt
 * - Image analysis
 * - User style preferences
 * - Previous actions
 * - Metadata (style, seed, mood, palette)
 * 
 * Result: Prompts that evolve images without breaking them
 */

import type { ImageUnderstanding } from './imageUnderstanding';
import type { UserPreferences } from './userBehavior';

export interface PromptContext {
  userPrompt: string;
  imageUnderstanding?: ImageUnderstanding;
  userPreferences?: UserPreferences;
  previousActions?: string[];
  metadata?: {
    style?: string;
    seed?: string;
    mood?: string;
    palette?: string[];
  };
  intent?: 'variation' | 'enhancement' | 'style-change' | 'new-generation';
}

export interface SynthesizedPrompt {
  prompt: string;
  reasoning: string;
  confidence: number; // 0-100
  suggestions: string[];
}

/**
 * Synthesize a context-locked prompt that maintains image fidelity
 */
export function synthesizeContextLockedPrompt(context: PromptContext): SynthesizedPrompt {
  const { userPrompt, imageUnderstanding, userPreferences, intent = 'variation' } = context;

  // If we have image understanding, lock the context
  if (imageUnderstanding) {
    return synthesizeWithImageContext(userPrompt, imageUnderstanding, userPreferences, intent);
  }

  // Otherwise, use user preferences if available
  if (userPreferences) {
    return synthesizeWithPreferences(userPrompt, userPreferences);
  }

  // Fallback to basic enhancement
  return synthesizeBasic(userPrompt);
}

/**
 * Synthesize prompt with image context (most intelligent)
 */
function synthesizeWithImageContext(
  userPrompt: string,
  understanding: ImageUnderstanding,
  preferences?: UserPreferences,
  intent: PromptContext['intent'] = 'variation'
): SynthesizedPrompt {
  const lockedElements: string[] = [];
  const variableElements: string[] = [];

  // Lock core elements based on understanding
  if (understanding.subject) {
    lockedElements.push(`subject: ${understanding.subject}`);
  }

  if (understanding.composition.depth !== 'medium') {
    lockedElements.push(`depth of field: ${understanding.composition.depth}`);
  }

  if (understanding.lighting.type !== 'natural') {
    lockedElements.push(`lighting: ${understanding.lighting.type}`);
  }

  if (understanding.colorPalette.dominant.length > 0) {
    lockedElements.push(`color palette: ${understanding.colorPalette.dominant.join(', ')}`);
  }

  if (understanding.style.category) {
    lockedElements.push(`style: ${understanding.style.category}`);
  }

  // Apply user intent
  let enhancedPrompt = userPrompt;

  if (intent === 'variation') {
    // Create variation while maintaining core elements
    enhancedPrompt = `Create a variation of this image: ${userPrompt}. Maintain: ${lockedElements.join(', ')}.`;
  } else if (intent === 'enhancement') {
    // Enhance while preserving identity
    enhancedPrompt = `Enhance this image: ${userPrompt}. Preserve: ${lockedElements.join(', ')}. Improve: ${understanding.improvements.overall.join(', ')}.`;
  } else if (intent === 'style-change') {
    // Change style while keeping composition
    enhancedPrompt = `Transform this image to ${userPrompt} style. Keep: composition, subject, framing. Change: style, color palette, mood.`;
  }

  // Apply user preferences if available
  if (preferences) {
    if (preferences.preferredStyles.length > 0) {
      enhancedPrompt += ` Style preference: ${preferences.preferredStyles[0]}.`;
    }
    if (preferences.preferredColors.length > 0) {
      enhancedPrompt += ` Color preference: ${preferences.preferredColors[0]}.`;
    }
  }

  // Add technical quality markers
  enhancedPrompt += ` Professional quality, award-winning composition, commercial photography standard.`;

  return {
    prompt: enhancedPrompt,
    reasoning: `Locked ${lockedElements.length} core elements from image analysis. Applied ${intent} intent.`,
    confidence: 85,
    suggestions: generateSuggestions(understanding, intent),
  };
}

/**
 * Synthesize with user preferences only
 */
function synthesizeWithPreferences(
  userPrompt: string,
  preferences: UserPreferences
): SynthesizedPrompt {
  let enhanced = userPrompt;

  if (preferences.preferredStyles.length > 0) {
    enhanced += ` Style: ${preferences.preferredStyles[0]}.`;
  }

  if (preferences.preferredColors.length > 0) {
    enhanced += ` Colors: ${preferences.preferredColors[0]}.`;
  }

  if (preferences.preferredLighting) {
    enhanced += ` Lighting: ${preferences.preferredLighting}.`;
  }

  return {
    prompt: enhanced,
    reasoning: 'Applied user preferences to enhance prompt.',
    confidence: 70,
    suggestions: [],
  };
}

/**
 * Basic synthesis (fallback)
 */
function synthesizeBasic(userPrompt: string): SynthesizedPrompt {
  return {
    prompt: userPrompt,
    reasoning: 'Used prompt as-is without context enhancement.',
    confidence: 50,
    suggestions: [],
  };
}

/**
 * Generate contextual suggestions
 */
function generateSuggestions(
  understanding: ImageUnderstanding,
  intent: PromptContext['intent']
): string[] {
  const suggestions: string[] = [];

  if (intent === 'variation') {
    suggestions.push(`Try: "Same composition, different ${understanding.colorPalette.dominant[0] || 'color'} palette"`);
    suggestions.push(`Try: "Keep subject, change ${understanding.lighting.type} lighting"`);
  } else if (intent === 'enhancement') {
    if (understanding.improvements.lighting.length > 0) {
      suggestions.push(`Improve: ${understanding.improvements.lighting[0]}`);
    }
    if (understanding.improvements.color.length > 0) {
      suggestions.push(`Enhance: ${understanding.improvements.color[0]}`);
    }
  }

  return suggestions;
}

/**
 * Generate art-director level prompt from image
 */
export function generateArtDirectorPrompt(
  understanding: ImageUnderstanding,
  userIntent?: string
): string {
  const elements: string[] = [];

  // Subject and scene
  if (understanding.subject) {
    elements.push(understanding.subject);
  }

  // Style
  if (understanding.style.category) {
    elements.push(`${understanding.style.category} style`);
  }

  // Lighting
  if (understanding.lighting.type) {
    elements.push(`${understanding.lighting.type} lighting`);
    if (understanding.lighting.direction !== 'front') {
      elements.push(`from ${understanding.lighting.direction}`);
    }
  }

  // Composition
  if (understanding.composition.framing) {
    elements.push(`${understanding.composition.framing} framing`);
  }

  // Color
  if (understanding.colorPalette.dominant.length > 0) {
    elements.push(`${understanding.colorPalette.dominant.join(', ')} color palette`);
  }

  // Mood
  if (understanding.mood.primary) {
    elements.push(`${understanding.mood.primary} mood`);
  }

  let prompt = elements.join(', ');

  if (userIntent) {
    prompt = `${userIntent}. ${prompt}`;
  }

  // Add quality markers
  prompt += '. Professional quality, award-winning composition, commercial photography standard.';

  return prompt;
}

/**
 * Creative Director-level prompt generation
 * Top-tier human Creative Director behavior: context aware, continuity focused, zero drift
 */
export interface CreativeDirectorContext {
  userPrompt: string;
  imageUrl?: string;
  imageUnderstanding?: ImageUnderstanding;
  userPreferences?: UserPreferences;
  meta?: Record<string, unknown>;
}

export interface CreativeDirectorPrompt {
  prompt: string;
  reasoning: string;
  metadata: {
    styleLock?: string[];
    continuationStrength?: number;
    detectedStyles?: string[];
    colorCues?: string[];
    compositionCues?: string[];
    creativeDirection?: string;
  };
}

export async function generateCreativeDirectorPrompt(
  context: CreativeDirectorContext
): Promise<CreativeDirectorPrompt> {
  const { userPrompt, imageUrl, imageUnderstanding, userPreferences, meta } = context;

  // If we have image understanding, create a Creative Director analysis
  if (imageUnderstanding) {
    return generateCreativeDirectorPromptWithContext(
      userPrompt,
      imageUnderstanding,
      userPreferences,
      meta
    );
  }

  // If we have image URL but no understanding yet, try to get it
  if (imageUrl) {
    const { getCachedUnderstanding, analyzeImageDeep } = await import('./imageUnderstanding');
    let understanding = await getCachedUnderstanding(imageUrl);
    if (!understanding) {
      understanding = await analyzeImageDeep(imageUrl);
    }
    
    if (understanding) {
      return generateCreativeDirectorPromptWithContext(
        userPrompt,
        understanding,
        userPreferences,
        meta
      );
    }
  }

  // Fallback: use user preferences or basic prompt
  if (userPreferences) {
    return generateCreativeDirectorPromptWithPreferences(userPrompt, userPreferences);
  }

  return {
    prompt: userPrompt || "Create a professional, high-quality image",
    reasoning: "Using base prompt without image context",
    metadata: {},
  };
}

/**
 * Generate Creative Director prompt with full image context
 * This is where the magic happens - zero drift, perfect continuity
 */
function generateCreativeDirectorPromptWithContext(
  userPrompt: string,
  understanding: ImageUnderstanding,
  preferences?: UserPreferences,
  meta?: Record<string, unknown>
): CreativeDirectorPrompt {
  // Extract core identity elements (these MUST be preserved)
  const coreIdentity: string[] = [];
  const styleElements: string[] = [];
  const colorCues: string[] = [];
  const compositionCues: string[] = [];

  // Core identity - what makes this image THIS image
  if (understanding.subject) {
    coreIdentity.push(understanding.subject);
  }
  if (understanding.sceneType) {
    coreIdentity.push(`${understanding.sceneType} scene`);
  }

  // Style elements detected
  if (understanding.style.category) {
    styleElements.push(understanding.style.category);
  }
  if (understanding.style.technique) {
    styleElements.push(understanding.style.technique);
  }
  if (understanding.style.influences?.length) {
    styleElements.push(...understanding.style.influences.slice(0, 2));
  }

  // Color and composition cues
  if (understanding.colorPalette.dominant.length > 0) {
    colorCues.push(...understanding.colorPalette.dominant.slice(0, 3));
  }
  if (understanding.composition.framing) {
    compositionCues.push(understanding.composition.framing);
  }
  if (understanding.composition.perspective) {
    compositionCues.push(understanding.composition.perspective);
  }

  // Determine user intent
  const isVariation = userPrompt.toLowerCase().includes('variation') || 
                     userPrompt.toLowerCase().includes('variation of') ||
                     userPrompt === "Refine this image" ||
                     !userPrompt.trim();
  
  const isEnhancement = userPrompt.toLowerCase().includes('enhance') ||
                        userPrompt.toLowerCase().includes('improve') ||
                        userPrompt.toLowerCase().includes('refine');

  // Build Creative Director prompt
  let creativePrompt = "";
  let creativeDirection = "";

  if (isVariation) {
    // Variation: maintain core identity, allow style/color variations
    creativePrompt = `Create a variation of this image`;
    
    if (coreIdentity.length > 0) {
      creativePrompt += ` featuring ${coreIdentity.join(' and ')}`;
    }
    
    // Lock style elements
    if (styleElements.length > 0) {
      creativePrompt += `. Maintain ${styleElements.slice(0, 2).join(' and ')} style`;
    }
    
    // Lock color harmony
    if (colorCues.length > 0) {
      creativePrompt += ` with ${colorCues.slice(0, 2).join(' and ')} color palette`;
    }
    
    // Allow composition changes but maintain quality
    if (compositionCues.length > 0) {
      creativePrompt += `. Consider ${compositionCues[0]} composition`;
    }
    
    creativeDirection = `Variation maintaining core identity and style`;
  } else if (isEnhancement) {
    // Enhancement: improve while preserving everything
    creativePrompt = `Enhance this image`;
    
    if (coreIdentity.length > 0) {
      creativePrompt += ` of ${coreIdentity.join(' and ')}`;
    }
    
    // Preserve all style elements
    if (styleElements.length > 0) {
      creativePrompt += `. Preserve ${styleElements.join(', ')} style`;
    }
    
    // Enhance color while maintaining palette
    if (colorCues.length > 0) {
      creativePrompt += `. Enhance ${colorCues.slice(0, 2).join(' and ')} color harmony`;
    }
    
    // Improve technical aspects
    if (understanding.improvements.overall.length > 0) {
      creativePrompt += `. Improve: ${understanding.improvements.overall.slice(0, 2).join(', ')}`;
    }
    
    creativeDirection = `Enhancement preserving all visual elements`;
  } else {
    // New generation with context: use image as reference
    creativePrompt = userPrompt;
    
    // Add context from image
    if (styleElements.length > 0) {
      creativePrompt += `. Reference style: ${styleElements.slice(0, 2).join(', ')}`;
    }
    if (colorCues.length > 0) {
      creativePrompt += `. Color inspiration: ${colorCues.slice(0, 2).join(', ')}`;
    }
    if (compositionCues.length > 0) {
      creativePrompt += `. Composition approach: ${compositionCues[0]}`;
    }
    
    creativeDirection = `Context-aware generation inspired by reference`;
  }

  // Add lighting context
  if (understanding.lighting.type && understanding.lighting.type !== 'natural') {
    creativePrompt += `. Lighting: ${understanding.lighting.type}`;
    if (understanding.lighting.direction !== 'front') {
      creativePrompt += ` from ${understanding.lighting.direction}`;
    }
  }

  // Add mood
  if (understanding.mood.primary) {
    creativePrompt += `. Mood: ${understanding.mood.primary}`;
  }

  // Apply user preferences
  if (preferences) {
    if (preferences.preferredStyles?.length && !styleElements.includes(preferences.preferredStyles[0])) {
      creativePrompt += `. User style preference: ${preferences.preferredStyles[0]}`;
    }
    if (preferences.preferredColors?.length) {
      creativePrompt += `. User color preference: ${preferences.preferredColors[0]}`;
    }
  }

  // Add quality markers
  creativePrompt += `. Professional quality, award-winning composition, commercial photography standard, high detail, sharp focus`;

  // Calculate continuation strength
  const continuationStrength = isVariation ? 0.3 : (isEnhancement ? 0.2 : 0.5);

  return {
    prompt: creativePrompt,
    reasoning: creativeDirection + `. Detected ${styleElements.length} style elements, ${colorCues.length} color cues, ${compositionCues.length} composition cues. Zero drift ensured.`,
    metadata: {
      styleLock: styleElements,
      continuationStrength,
      detectedStyles: styleElements,
      colorCues,
      compositionCues,
      creativeDirection,
    },
  };
}

/**
 * Generate Creative Director prompt with user preferences only
 */
function generateCreativeDirectorPromptWithPreferences(
  userPrompt: string,
  preferences: UserPreferences
): CreativeDirectorPrompt {
  let prompt = userPrompt;

  if (preferences.preferredStyles?.length) {
    prompt += `. Style: ${preferences.preferredStyles[0]}`;
  }
  if (preferences.preferredColors?.length) {
    prompt += `. Colors: ${preferences.preferredColors[0]}`;
  }
  if (preferences.preferredLighting) {
    prompt += `. Lighting: ${preferences.preferredLighting}`;
  }

  prompt += `. Professional quality, award-winning composition`;

  return {
    prompt,
    reasoning: "Applied user preferences to enhance prompt",
    metadata: {
      detectedStyles: preferences.preferredStyles || [],
      colorCues: preferences.preferredColors || [],
    },
  };
}

/**
 * Analyze prompt for drift potential
 */
export function analyzePromptDrift(
  originalPrompt: string,
  newPrompt: string,
  understanding?: ImageUnderstanding
): {
  driftScore: number; // 0-100, higher = more drift
  riskAreas: string[];
  recommendations: string[];
} {
  // Simple keyword-based drift detection
  const originalKeywords = extractKeywords(originalPrompt);
  const newKeywords = extractKeywords(newPrompt);
  
  const commonKeywords = originalKeywords.filter(k => newKeywords.includes(k));
  const driftScore = 100 - (commonKeywords.length / originalKeywords.length) * 100;

  const riskAreas: string[] = [];
  const recommendations: string[] = [];

  if (driftScore > 50) {
    riskAreas.push('High drift detected - image may change significantly');
    if (understanding) {
      recommendations.push(`Lock these elements: ${understanding.subject}, ${understanding.style.category}`);
    }
  }

  if (driftScore > 30) {
    riskAreas.push('Moderate drift - some elements may change');
    recommendations.push('Consider using "variation" mode to maintain core elements');
  }

  return {
    driftScore,
    riskAreas,
    recommendations,
  };
}

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  // Filter out common words
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  return words.filter(w => w.length > 3 && !stopWords.includes(w));
}

