/**
 * Creative Brief Intelligence System
 * Enhanced analysis and idea generation for uploaded briefs
 */

import { supabase } from "@/integrations/supabase/client";

export interface CreativeBriefAnalysis {
  summary: string;
  keyInsights: string[];
  targetAudience?: string;
  deliverables?: string[];
  tonalKeywords?: string[];
  brandTone?: string;
  visualDirection?: string[];
  colorPalette?: string[];
  styleKeywords?: string[];
  moodboardDirections?: string[];
  conceptIdeas?: string[];
  firstPostDrafts?: string[];
  brandStories?: string[];
  visualReferences?: string[];
  constraints?: string[];
  goals?: string[];
}

/**
 * Enhanced brief analysis with creative intelligence
 */
export async function analyzeCreativeBrief(
  fileName: string,
  text: string
): Promise<CreativeBriefAnalysis> {
  try {
    const trimmedText = text.length > 20000 ? text.slice(0, 20000) : text;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No active session');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-brief`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        filename: fileName,
        text: trimmedText,
        enhanced: true, // Request enhanced analysis
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to analyze brief';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // ignore
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    // Return enhanced analysis with all fields
    return {
      summary: result.summary || '',
      keyInsights: result.key_insights || result.keyInsights || [],
      targetAudience: result.target_audience || result.targetAudience,
      deliverables: result.deliverables || [],
      tonalKeywords: result.tonal_keywords || result.tonalKeywords || [],
      brandTone: result.brand_tone || result.brandTone,
      visualDirection: result.visual_direction || result.visualDirection || [],
      colorPalette: result.color_palette || result.colorPalette || [],
      styleKeywords: result.style_keywords || result.styleKeywords || [],
      moodboardDirections: result.moodboard_directions || result.moodboardDirections || [],
      conceptIdeas: result.concept_ideas || result.conceptIdeas || [],
      firstPostDrafts: result.first_post_drafts || result.firstPostDrafts || [],
      brandStories: result.brand_stories || result.brandStories || [],
      visualReferences: result.visual_references || result.visualReferences || [],
      constraints: result.constraints || [],
      goals: result.goals || [],
    };
  } catch (error) {
    console.error('[CreativeBrief] Analysis error:', error);
    throw error;
  }
}

/**
 * Generate concept ideas from brief analysis
 */
export async function generateConceptIdeas(
  briefAnalysis: CreativeBriefAnalysis
): Promise<string[]> {
  // Use Intelligence Framework to generate contextual ideas
  try {
    const { synthesizeContextLockedPrompt } = await import('@/lib/intelligence/promptIntelligence');
    
    const conceptPrompts = briefAnalysis.conceptIdeas || [];
    
    // If no concepts from analysis, generate them
    if (conceptPrompts.length === 0) {
      const basePrompt = `Create visual concepts for: ${briefAnalysis.summary}`;
      const synthesized = synthesizeContextLockedPrompt({
        userPrompt: basePrompt,
        imageUnderstanding: undefined,
        userPreferences: undefined,
        intent: 'new-generation',
        metadata: {
          style: briefAnalysis.styleKeywords?.join(', '),
        },
      });
      
      // Extract concept ideas from synthesized prompt
      return [synthesized.prompt];
    }
    
    return conceptPrompts;
  } catch (error) {
    console.error('[CreativeBrief] Concept generation error:', error);
    return briefAnalysis.conceptIdeas || [];
  }
}

/**
 * Generate moodboard directions from brief
 */
export function generateMoodboardDirections(briefAnalysis: CreativeBriefAnalysis): string[] {
  const directions: string[] = [];
  
  if (briefAnalysis.colorPalette?.length) {
    directions.push(`Color palette: ${briefAnalysis.colorPalette.join(', ')}`);
  }
  
  if (briefAnalysis.styleKeywords?.length) {
    directions.push(`Style: ${briefAnalysis.styleKeywords.join(', ')}`);
  }
  
  if (briefAnalysis.visualDirection?.length) {
    directions.push(...briefAnalysis.visualDirection);
  }
  
  if (briefAnalysis.moodboardDirections?.length) {
    directions.push(...briefAnalysis.moodboardDirections);
  }
  
  // Generate additional directions if needed
  if (directions.length === 0 && briefAnalysis.brandTone) {
    directions.push(`Brand tone: ${briefAnalysis.brandTone}`);
  }
  
  return directions;
}

