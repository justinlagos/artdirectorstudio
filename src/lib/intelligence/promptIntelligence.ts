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

