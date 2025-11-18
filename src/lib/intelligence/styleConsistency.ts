/**
 * Style Consistency System
 * Prevents creative drift by maintaining style consistency across variations
 */

import { ImageUnderstanding } from "./imageUnderstanding";
import { UserPreferences } from "./userBehavior";

export interface StyleMetadata {
  colorPalette: string[];
  lighting: string;
  mood: string;
  composition: string;
  artisticStyle: string;
  technique: string;
  subjectMatter: string;
  visualElements: string[];
}

/**
 * Extract style metadata from image understanding
 */
export function extractStyleMetadata(
  understanding: ImageUnderstanding
): StyleMetadata {
  return {
    colorPalette: understanding.colorPalette?.dominant || [],
    lighting: understanding.lighting?.type || 'natural',
    mood: understanding.mood?.primary || 'neutral',
    composition: understanding.composition?.framing || 'balanced',
    artisticStyle: understanding.style?.category || 'realistic',
    technique: understanding.style?.technique || 'photography',
    subjectMatter: understanding.subject || '',
    visualElements: understanding.objects || [],
  };
}

/**
 * Generate style-locked prompt for variations
 * Ensures variations maintain core style elements
 */
export function generateStyleLockedPrompt(
  basePrompt: string,
  styleMetadata: StyleMetadata,
  variationIntent: 'subtle' | 'moderate' | 'major' = 'moderate'
): string {
  const lockedElements: string[] = [];
  
  // Always lock core style elements
  if (styleMetadata.artisticStyle) {
    lockedElements.push(`artistic style: ${styleMetadata.artisticStyle}`);
  }
  
  if (styleMetadata.colorPalette.length > 0) {
    lockedElements.push(`color palette: ${styleMetadata.colorPalette.slice(0, 3).join(', ')}`);
  }
  
  if (styleMetadata.lighting) {
    lockedElements.push(`lighting: ${styleMetadata.lighting}`);
  }
  
  // Variation intensity determines what can change
  if (variationIntent === 'subtle') {
    // Lock almost everything - only minor changes
    if (styleMetadata.composition) {
      lockedElements.push(`composition: ${styleMetadata.composition}`);
    }
    if (styleMetadata.mood) {
      lockedElements.push(`mood: ${styleMetadata.mood}`);
    }
  } else if (variationIntent === 'moderate') {
    // Lock style and colors, allow composition/mood changes
    // (already locked above)
  } else {
    // Major variation - only lock core style, allow everything else to change
    // (minimal locking)
  }
  
  const styleLock = lockedElements.length > 0
    ? `Maintain these style elements: ${lockedElements.join('; ')}. `
    : '';
  
  return `${styleLock}${basePrompt}`;
}

/**
 * Calculate continuation strength based on variation intent
 * Different from promptSimilarity's calculateContinuationStrength which uses text similarity
 */
export function calculateVariationContinuationStrength(
  variationIntent: 'subtle' | 'moderate' | 'major' = 'moderate'
): number {
  switch (variationIntent) {
    case 'subtle':
      return 0.2; // High continuity - minimal changes
    case 'moderate':
      return 0.5; // Balanced continuity
    case 'major':
      return 0.8; // Low continuity - major changes allowed
    default:
      return 0.5;
  }
}

/**
 * Generate context-aware variation prompt
 * Combines user preferences, image understanding, and variation intent
 */
export async function generateContextAwareVariation(
  basePrompt: string,
  imageUrl: string,
  variationIntent: 'subtle' | 'moderate' | 'major' = 'moderate',
  userPreferences?: UserPreferences,
  imageUnderstanding?: ImageUnderstanding
): Promise<{
  prompt: string;
  continuationStrength: number;
  styleLock: string[];
}> {
  // Get or analyze image understanding
  let understanding = imageUnderstanding;
  if (!understanding) {
    const { analyzeImageDeep, getCachedUnderstanding } = await import('./imageUnderstanding');
    understanding = await getCachedUnderstanding(imageUrl) || await analyzeImageDeep(imageUrl);
  }
  
  // Extract style metadata
  const styleMetadata = understanding
    ? extractStyleMetadata(understanding)
    : {
        colorPalette: [],
        lighting: 'natural',
        mood: 'neutral',
        composition: 'balanced',
        artisticStyle: 'realistic',
        technique: 'photography',
        subjectMatter: '',
        visualElements: [],
      };
  
  // Apply user preferences if available
  if (userPreferences) {
    // Merge user's preferred styles with image style
    if (userPreferences.preferredStyles?.length) {
      styleMetadata.artisticStyle = userPreferences.preferredStyles[0];
    }
    if (userPreferences.preferredColors?.length) {
      styleMetadata.colorPalette = [
        ...styleMetadata.colorPalette,
        ...userPreferences.preferredColors.slice(0, 2),
      ];
    }
  }
  
  // Generate style-locked prompt
  const styleLockedPrompt = generateStyleLockedPrompt(
    basePrompt,
    styleMetadata,
    variationIntent
  );
  
  // Calculate continuation strength
  const continuationStrength = calculateVariationContinuationStrength(variationIntent);
  
  // Extract locked elements for reference
  const styleLock: string[] = [];
  if (styleMetadata.artisticStyle) styleLock.push(styleMetadata.artisticStyle);
  if (styleMetadata.colorPalette.length) {
    styleLock.push(...styleMetadata.colorPalette.slice(0, 3));
  }
  if (styleMetadata.lighting) styleLock.push(styleMetadata.lighting);
  
  return {
    prompt: styleLockedPrompt,
    continuationStrength,
    styleLock,
  };
}

