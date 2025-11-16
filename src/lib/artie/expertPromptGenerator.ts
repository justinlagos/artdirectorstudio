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

    // Build expert analysis
    const analysis = {
      lighting: understanding.lightingConditions || 'neutral',
      color: understanding.colorPalette?.join(', ') || 'balanced',
      composition: understanding.composition || 'standard',
      style: understanding.style || 'realistic',
      issues: understanding.technicalIssues || [],
      strengths: understanding.potentialImprovements?.length ? [] : ['well-composed', 'good exposure'],
    };

    // Generate suggested edits
    const suggestedEdits: string[] = [];
    
    if (understanding.technicalIssues?.includes('underexposed')) {
      suggestedEdits.push("Brighten overall exposure while preserving highlights");
    }
    if (understanding.technicalIssues?.includes('overexposed')) {
      suggestedEdits.push("Recover highlight details and balance exposure");
    }
    if (understanding.technicalIssues?.includes('uneven lighting')) {
      suggestedEdits.push("Even out lighting across the image");
    }
    if (understanding.potentialImprovements?.some(imp => imp.includes('color'))) {
      suggestedEdits.push("Enhance color harmony and saturation");
    }
    if (understanding.potentialImprovements?.some(imp => imp.includes('depth'))) {
      suggestedEdits.push("Increase depth of field and visual separation");
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
    if (understanding.summary) {
      promptParts.push(`Based on: ${understanding.summary}`);
    }

    // Add technical observations
    const observations: string[] = [];
    if (understanding.lightingConditions && understanding.lightingConditions !== 'unknown') {
      observations.push(`${understanding.lightingConditions} lighting`);
    }
    if (understanding.colorPalette?.length) {
      observations.push(`color palette: ${understanding.colorPalette.slice(0, 3).join(', ')}`);
    }
    if (understanding.style && understanding.style !== 'unknown') {
      observations.push(`${understanding.style} style`);
    }
    if (understanding.composition && understanding.composition !== 'unknown') {
      observations.push(`${understanding.composition} composition`);
    }

    if (observations.length > 0) {
      promptParts.push(`Current characteristics: ${observations.join(', ')}`);
    }

    // Add improvement suggestions
    if (understanding.potentialImprovements?.length) {
      promptParts.push(`Consider: ${understanding.potentialImprovements.slice(0, 3).join(', ')}`);
    }

    // Incorporate user preferences
    if (preferences?.preferredStyles?.length) {
      promptParts.push(`User prefers: ${preferences.preferredStyles.slice(0, 2).join(', ')} styles`);
    }

    // Build final prompt
    let expertPrompt = promptParts.join('. ');
    
    // If no user intent, provide a default enhancement prompt
    if (!userIntent || userIntent === "Refine this image") {
      expertPrompt = `Refine this image while maintaining its core identity. ${expertPrompt}`;
    }

    return {
      prompt: expertPrompt,
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

