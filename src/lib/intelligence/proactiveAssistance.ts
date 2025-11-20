/**
 * Proactive Assistance System - Phase 4
 * 
 * Provides intelligent, context-aware suggestions based on:
 * - User behavior patterns
 * - Current workflow context
 * - Historical preferences
 * - Cross-session memory
 */

import { supabase } from "@/integrations/supabase/client";
import type { UserPreferences } from './userBehavior';
import type { ImageUnderstanding } from './imageUnderstanding';

export interface ProactiveSuggestion {
  type: 'workflow' | 'quality' | 'optimization' | 'variation' | 'enhancement' | 'batch';
  message: string;
  action?: {
    tool: string;
    params?: Record<string, unknown>;
  };
  confidence: number; // 0-100
  context: string;
}

export interface WorkflowContext {
  currentAction?: 'analyzing' | 'generating' | 'editing' | 'blending' | 'upscaling' | 'browsing';
  recentImages?: string[];
  recentActions?: string[];
  currentProject?: string;
  sessionDuration?: number;
  imagesInSession?: number;
}

/**
 * Generate proactive suggestions based on current context
 */
export async function generateProactiveSuggestions(
  userId: string,
  context: WorkflowContext,
  userPreferences?: UserPreferences
): Promise<ProactiveSuggestion[]> {
  const suggestions: ProactiveSuggestion[] = [];

  try {
    // Get user preferences if not provided
    let preferences = userPreferences;
    if (!preferences) {
      const { getUserPreferences } = await import('./userBehavior');
      preferences = await getUserPreferences(userId);
    }

    // Get recent activity
    const recentActivity = await getRecentActivity(userId);

    // Generate suggestions based on context
    suggestions.push(...generateWorkflowSuggestions(context, recentActivity, preferences));
    suggestions.push(...generateQualitySuggestions(context, recentActivity, preferences));
    suggestions.push(...generateOptimizationSuggestions(context, recentActivity, preferences));
    suggestions.push(...generateVariationSuggestions(context, recentActivity, preferences));

    // Sort by confidence and return top suggestions
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Return top 3 suggestions
  } catch (error) {
    console.error('[ProactiveAssistance] Error generating suggestions:', error);
    return [];
  }
}

/**
 * Generate workflow-based suggestions
 */
function generateWorkflowSuggestions(
  context: WorkflowContext,
  recentActivity: any[],
  preferences?: UserPreferences
): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];

  // After generating images, suggest variations or upscaling
  if (context.currentAction === 'generating' && context.recentImages && context.recentImages.length > 0) {
    suggestions.push({
      type: 'variation',
      message: "Want me to create variations or refine the style?",
      action: {
        tool: 'edit_image',
        params: { imageUrl: context.recentImages[0] }
      },
      confidence: 75,
      context: 'post-generation'
    });

    // If user frequently upscales, suggest it
    if (preferences?.qualityPreferences?.upscaleFrequency > 0.3) {
      suggestions.push({
        type: 'quality',
        message: "Want me to upscale this for higher resolution?",
        action: {
          tool: 'upscale',
          params: { imageUrl: context.recentImages[0] }
        },
        confidence: 80,
        context: 'post-generation-upscale-preference'
      });
    }
  }

  // After editing, suggest upscaling or more variations
  if (context.currentAction === 'editing' && context.recentImages && context.recentImages.length > 0) {
    suggestions.push({
      type: 'enhancement',
      message: "Should I upscale this or create more variations?",
      confidence: 70,
      context: 'post-edit'
    });
  }

  // If user has multiple images, suggest blending
  if (context.recentImages && context.recentImages.length >= 2) {
    suggestions.push({
      type: 'workflow',
      message: "Want me to blend these images together?",
      action: {
        tool: 'blend',
        params: { imageUrls: context.recentImages.slice(0, 2) }
      },
      confidence: 65,
      context: 'multiple-images'
    });
  }

  // Batch operations suggestion
  if (context.imagesInSession && context.imagesInSession >= 3) {
    suggestions.push({
      type: 'batch',
      message: `You have ${context.imagesInSession} images — want me to process them all at once?`,
      confidence: 60,
      context: 'batch-opportunity'
    });
  }

  return suggestions;
}

/**
 * Generate quality improvement suggestions
 */
function generateQualitySuggestions(
  context: WorkflowContext,
  recentActivity: any[],
  preferences?: UserPreferences
): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];

  // Before upscaling, suggest enhancements
  if (context.currentAction === 'upscaling' && context.recentImages && context.recentImages.length > 0) {
    suggestions.push({
      type: 'quality',
      message: "Before upscaling, want me to enhance the colors and contrast first?",
      confidence: 70,
      context: 'pre-upscale-enhancement'
    });
  }

  return suggestions;
}

/**
 * Generate optimization suggestions
 */
function generateOptimizationSuggestions(
  context: WorkflowContext,
  recentActivity: any[],
  preferences?: UserPreferences
): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];

  // If user is doing repetitive actions, suggest optimization
  const recentActions = recentActivity.slice(0, 5);
  const actionCounts = recentActions.reduce((acc, action) => {
    acc[action.action] = (acc[action.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // If user repeatedly generates similar prompts, suggest variations
  if (actionCounts['generate'] >= 3) {
    suggestions.push({
      type: 'optimization',
      message: "I notice you're generating similar images — want me to create variations instead?",
      confidence: 65,
      context: 'repetitive-generation'
    });
  }

  return suggestions;
}

/**
 * Generate variation suggestions
 */
function generateVariationSuggestions(
  context: WorkflowContext,
  recentActivity: any[],
  preferences?: UserPreferences
): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];

  // If user has a single image and frequently creates variations
  if (context.recentImages && context.recentImages.length === 1 && 
      preferences?.qualityPreferences?.editFrequency > 0.2) {
    suggestions.push({
      type: 'variation',
      message: "Want me to create variations with different styles or moods?",
      action: {
        tool: 'edit_image',
        params: { imageUrl: context.recentImages[0] }
      },
      confidence: 75,
      context: 'variation-preference'
    });
  }

  return suggestions;
}

/**
 * Get recent user activity
 */
async function getRecentActivity(userId: string, limit: number = 10): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('generated_assets')
      .select('action, image_url, params, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ProactiveAssistance] Error fetching recent activity:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[ProactiveAssistance] Error getting recent activity:', error);
    return [];
  }
}

/**
 * Analyze workflow pattern and suggest next steps
 */
export async function analyzeWorkflowPattern(
  userId: string,
  currentContext: WorkflowContext
): Promise<string[]> {
  try {
    const recentActivity = await getRecentActivity(userId, 20);
    
    // Analyze patterns
    const patterns: string[] = [];
    
    // Check for common workflows
    const actions = recentActivity.map(a => a.action);
    
    // Pattern: Generate -> Edit -> Upscale
    if (actions.includes('generate') && actions.includes('edit') && actions.includes('upscale')) {
      patterns.push('generate-edit-upscale');
    }
    
    // Pattern: Analyze -> Generate
    if (actions.includes('analyze') && actions.includes('generate')) {
      patterns.push('analyze-generate');
    }
    
    // Pattern: Blend -> Upscale
    if (actions.includes('blend') && actions.includes('upscale')) {
      patterns.push('blend-upscale');
    }
    
    // Generate suggestions based on patterns
    const suggestions: string[] = [];
    
    if (patterns.includes('generate-edit-upscale') && currentContext.currentAction === 'generating') {
      suggestions.push('After generating, you typically edit and upscale — want me to prepare those steps?');
    }
    
    if (patterns.includes('analyze-generate') && currentContext.currentAction === 'analyzing') {
      suggestions.push('After analyzing, you usually generate — ready to create visuals?');
    }
    
    return suggestions;
  } catch (error) {
    console.error('[ProactiveAssistance] Error analyzing workflow pattern:', error);
    return [];
  }
}

/**
 * Get personalized recommendations based on preferences
 */
export function getPersonalizedRecommendations(
  preferences: UserPreferences,
  currentContext: WorkflowContext
): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];

  // Style-based recommendations
  if (preferences.preferredStyles.length > 0 && currentContext.currentAction === 'generating') {
    suggestions.push({
      type: 'variation',
      message: `Given your preference for ${preferences.preferredStyles[0]} style, want me to apply that?`,
      confidence: 70,
      context: 'style-preference'
    });
  }

  // Color-based recommendations
  if (preferences.preferredColors.length > 0) {
    suggestions.push({
      type: 'enhancement',
      message: `Want me to enhance the ${preferences.preferredColors[0]} color palette?`,
      confidence: 65,
      context: 'color-preference'
    });
  }

  // Tool preference recommendations
  if (preferences.qualityPreferences.upscaleFrequency > 0.4) {
    suggestions.push({
      type: 'quality',
      message: "You frequently upscale images — want me to upscale this one?",
      confidence: 75,
      context: 'tool-preference'
    });
  }

  return suggestions;
}

