/**
 * Expert Prompt Generator for Studio
 * Generates art-director level prompts when sending images from Artie to Studio
 */

import { ImageUnderstanding } from "@/lib/intelligence/imageUnderstanding";
import { UserPreferences } from "@/lib/intelligence/userBehavior";

export interface ExpertAnalysis {
  prompt: string;
  suggestedEdits: string[];
  analysis: {
    lighting: string;
    color: string;
    composition: string;
    style: string;
    issues: string[];
    strengths: string[];
  };
}

/**
 * Generate expert-level prompt for Studio based on image analysis
 */
export async function generateExpertStudioPrompt(
  imageUrl: string,
  userIntent?: string,
  imageUnderstanding?: ImageUnderstanding,
  userPreferences?: UserPreferences
): Promise<ExpertAnalysis> {
  // Import dynamically to avoid circular dependencies
  const { analyzeImageDeep, getCachedUnderstanding } = await import('@/lib/intelligence/imageUnderstanding');
  const { getUserPreferences } = await import('@/lib/intelligence/userBehavior');
  const { supabase } = await import('@/integrations/supabase/client');

  try {
    // Get image understanding
    let understanding = imageUnderstanding;
    if (!understanding) {
      understanding = await getCachedUnderstanding(imageUrl) || await analyzeImageDeep(imageUrl);
    }

    // Get user preferences
    let preferences = userPreferences;
    if (!preferences) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        preferences = await getUserPreferences(user.id);
      }
    }

    // Build expert analysis using correct nested structure
    const analysis = {
      lighting: typeof understanding.lighting === 'object' ? understanding.lighting.type : 'neutral',
      color: understanding.colorPalette?.dominant?.join(', ') || 'balanced',
      composition: typeof understanding.composition === 'object' ? understanding.composition.framing : 'standard',
      style: typeof understanding.style === 'object' ? understanding.style.category : 'realistic',
      issues: understanding.technical?.shadows?.issues || [],
      strengths: understanding.improvements?.overall?.length ? [] : ['well-composed', 'good exposure'],
    };

    // Generate suggested edits based on technical assessment
    const suggestedEdits: string[] = [];
    
    if (understanding.technical?.exposure === 'underexposed') {
      suggestedEdits.push("Brighten overall exposure while preserving highlights");
    }
    if (understanding.technical?.exposure === 'overexposed') {
      suggestedEdits.push("Recover highlight details and balance exposure");
    }
    if (understanding.technical?.shadows?.quality === 'uneven') {
      suggestedEdits.push("Even out lighting across the image");
    }
    if (understanding.improvements?.color?.length) {
      suggestedEdits.push("Enhance color harmony and saturation");
    }
    if (understanding.improvements?.composition?.length) {
      suggestedEdits.push("Optimize composition and framing");
    }

    // If no specific issues, suggest creative enhancements
    if (suggestedEdits.length === 0) {
      suggestedEdits.push("Enhance visual impact with subtle adjustments");
      suggestedEdits.push("Refine color grading for brand consistency");
      suggestedEdits.push("Optimize composition and framing");
    }

    // Build expert prompt
    let promptParts: string[] = [];

    // Start with user intent if provided
    if (userIntent && userIntent.trim() && userIntent !== "Refine this image") {
      promptParts.push(userIntent);
    }

    // Add image context
    if (understanding.subject) {
      promptParts.push(`Based on: ${understanding.subject}`);
    }

    // Add technical observations
    const observations: string[] = [];
    if (understanding.lighting && typeof understanding.lighting === 'object' && understanding.lighting.type !== 'mixed') {
      observations.push(`${understanding.lighting.type} lighting`);
    }
    if (understanding.colorPalette?.dominant?.length) {
      observations.push(`color palette: ${understanding.colorPalette.dominant.slice(0, 3).join(', ')}`);
    }
    if (understanding.style && typeof understanding.style === 'object') {
      observations.push(`${understanding.style.category} style`);
    }
    if (understanding.composition && typeof understanding.composition === 'object') {
      observations.push(`${understanding.composition.framing} composition`);
    }

    if (observations.length > 0) {
      promptParts.push(observations.join(', '));
    }

    // Add improvement focus
    if (understanding.improvements?.overall?.length) {
      promptParts.push(`Focus on: ${understanding.improvements.overall.join(', ')}`);
    }

    // Add user preferences if available
    if (preferences) {
      const preferenceDetails: string[] = [];
      
      if (preferences.preferredStyles?.length) {
        preferenceDetails.push(`Preferred styles: ${preferences.preferredStyles.slice(0, 3).join(', ')}`);
      }

      if (preferenceDetails.length > 0) {
        promptParts.push(preferenceDetails.join(', '));
      }
    }

    // Construct final prompt
    const prompt = promptParts.length > 0 
      ? promptParts.join('. ') 
      : "Refine this image with professional quality adjustments";

    return {
      prompt,
      suggestedEdits,
      analysis,
    };

  } catch (error) {
    console.error('Error generating expert prompt:', error);
    
    // Return safe fallback
    return {
      prompt: userIntent || "Refine this image",
      suggestedEdits: ["Enhance overall quality"],
      analysis: {
        lighting: 'neutral',
        color: 'balanced',
        composition: 'standard',
        style: 'realistic',
        issues: [],
        strengths: ['original character'],
      },
    };
  }
}
