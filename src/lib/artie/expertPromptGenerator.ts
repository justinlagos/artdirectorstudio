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
 * Uses Creative Director approach for zero-drift, context-aware prompts
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
  const { generateCreativeDirectorPrompt } = await import('@/lib/intelligence/promptIntelligence');
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

    // Use Creative Director prompt generation (zero-drift, context-aware)
    const creativePrompt = await generateCreativeDirectorPrompt({
      userPrompt: userIntent || "Refine this image",
      imageUrl,
      imageUnderstanding: understanding,
      userPreferences: preferences,
    });

    // Build expert analysis from understanding
    const analysis = {
      lighting: understanding.lighting?.type || 'neutral',
      color: understanding.colorPalette?.dominant?.join(', ') || 'balanced',
      composition: understanding.composition?.framing || 'standard',
      style: understanding.style?.category || 'realistic',
      issues: understanding.technical?.shadows?.issues || [],
      strengths: understanding.improvements?.overall?.length ? [] : ['well-composed', 'good exposure'],
    };

    // Generate suggested edits based on Creative Director analysis
    const suggestedEdits: string[] = [];
    
    // Technical improvements
    if (understanding.technical?.exposure === 'underexposed') {
      suggestedEdits.push("Brighten overall exposure while preserving highlights");
    }
    if (understanding.technical?.exposure === 'overexposed') {
      suggestedEdits.push("Recover highlight details and balance exposure");
    }
    if (understanding.technical?.shadows?.quality === 'uneven') {
      suggestedEdits.push("Even out lighting across the image");
    }
    
    // Creative enhancements from Creative Director metadata
    if (creativePrompt.metadata.colorCues?.length) {
      suggestedEdits.push(`Enhance ${creativePrompt.metadata.colorCues.slice(0, 2).join(' and ')} color harmony`);
    }
    if (creativePrompt.metadata.compositionCues?.length) {
      suggestedEdits.push(`Optimize ${creativePrompt.metadata.compositionCues[0]} composition`);
    }
    if (understanding.improvements?.color?.length) {
      suggestedEdits.push("Enhance color harmony and saturation");
    }

    // If no specific issues, suggest creative enhancements
    if (suggestedEdits.length === 0) {
      suggestedEdits.push("Enhance visual impact with subtle adjustments");
      suggestedEdits.push("Refine color grading for brand consistency");
      suggestedEdits.push("Optimize composition and framing");
    }

    return {
      prompt: creativePrompt.prompt,
      suggestedEdits: suggestedEdits.slice(0, 3),
      analysis,
    };
  } catch (error) {
    console.error('[ExpertPrompt] Error generating expert prompt:', error);
    
    // Fallback to basic prompt
    return {
      prompt: userIntent || "Refine this image with professional adjustments",
      suggestedEdits: [
        "Enhance overall visual quality",
        "Optimize color and lighting",
        "Refine composition"
      ],
      analysis: {
        lighting: 'neutral',
        color: 'balanced',
        composition: 'standard',
        style: 'realistic',
        issues: [],
        strengths: [],
      },
    };
  }
}

