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
      lighting: understanding.lighting?.type || 'neutral',
      color: understanding.colorPalette?.dominant?.join(', ') || 'balanced',
      composition: understanding.composition?.framing || 'standard',
      style: understanding.style?.category || 'realistic',
      issues: understanding.technical?.shadows?.issues || [],
      strengths: understanding.improvements?.overall?.length ? [] : ['well-composed', 'good exposure'],
    };

    // Generate suggested edits
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
    if (understanding.improvements?.composition?.some(imp => imp.includes('depth'))) {
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

    // Add image context (create summary from subject and background)
    const summary = understanding.subject 
      ? `${understanding.subject}${understanding.background ? ` with ${understanding.background}` : ''}`
      : understanding.sceneType;
    if (summary) {
      promptParts.push(`Based on: ${summary}`);
    }

    // Add technical observations
    const observations: string[] = [];
    if (understanding.lighting?.type && understanding.lighting.type !== 'natural') {
      observations.push(`${understanding.lighting.type} lighting`);
    }
    if (understanding.colorPalette?.dominant?.length) {
      observations.push(`color palette: ${understanding.colorPalette.dominant.slice(0, 3).join(', ')}`);
    }
    if (understanding.style?.category) {
      observations.push(`${understanding.style.category} style`);
    }
    if (understanding.composition?.framing) {
      observations.push(`${understanding.composition.framing} composition`);
    }

    if (observations.length > 0) {
      promptParts.push(`Current characteristics: ${observations.join(', ')}`);
    }

    // Add improvement suggestions
    if (understanding.improvements?.overall?.length) {
      promptParts.push(`Consider: ${understanding.improvements.overall.slice(0, 3).join(', ')}`);
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

