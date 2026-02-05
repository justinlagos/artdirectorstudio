/**
 * Proactive Artie Engine
 * 
 * Generates contextual suggestions based on user workflow triggers.
 * Only active when proactive mode is enabled in user preferences.
 */

import { supabase } from '@/integrations/supabase/client';

export type TriggerType = 
  | 'brief_uploaded'
  | 'generation_complete'
  | 'iteration_count'
  | 'style_drift'
  | 'multiple_images'
  | 'workflow_pattern'
  | 'quality_opportunity'
  | 'batch_opportunity';

export type SuggestionPriority = 'high' | 'medium' | 'low';

export interface ProactiveSuggestion {
  id: string;
  triggerType: TriggerType;
  suggestion: string;
  context: Record<string, any>;
  priority: SuggestionPriority;
  createdAt: Date;
  dismissed: boolean;
  actionTaken: boolean;
}

export interface TriggerContext {
  briefContent?: string;
  generationCount?: number;
  currentImageUrl?: string;
  previousImageUrl?: string;
  imageList?: Array<{ id: string; url: string; prompt?: string }>;
  iterationCount?: number;
  workflowActions?: string[];
  styleAnalysis?: {
    colors?: string[];
    style?: string;
    mood?: string;
  };
}

/**
 * Proactive Artie Engine Class
 */
export class ProactiveArtieEngine {
  private userId: string;
  private enabled: boolean;

  constructor(userId: string, enabled: boolean = false) {
    this.userId = userId;
    this.enabled = enabled;
  }

  /**
   * Check if proactive mode is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Analyze brief and generate clarifying questions
   */
  async analyzeBrief(briefContent: string): Promise<ProactiveSuggestion | null> {
    if (!this.enabled) return null;

    // Check if brief is substantial enough to analyze
    if (!briefContent || briefContent.trim().length < 50) {
      return null;
    }

    // Analyze brief for missing information
    const missingElements: string[] = [];
    
    if (!briefContent.toLowerCase().includes('color') && !briefContent.toLowerCase().includes('palette')) {
      missingElements.push('color palette');
    }
    if (!briefContent.toLowerCase().includes('style') && !briefContent.toLowerCase().includes('aesthetic')) {
      missingElements.push('visual style');
    }
    if (!briefContent.toLowerCase().includes('mood') && !briefContent.toLowerCase().includes('feeling')) {
      missingElements.push('mood or emotion');
    }
    if (!briefContent.toLowerCase().includes('audience') && !briefContent.toLowerCase().includes('target')) {
      missingElements.push('target audience');
    }

    if (missingElements.length === 0) {
      return null; // Brief is complete
    }

    const suggestion = `Your brief looks good! Consider adding details about: ${missingElements.join(', ')}. This will help generate more accurate results.`;

    return this.createSuggestion({
      triggerType: 'brief_uploaded',
      suggestion,
      context: { briefLength: briefContent.length, missingElements },
      priority: 'medium',
    });
  }

  /**
   * Detect style patterns from generation history
   */
  async detectStylePattern(generations: Array<{ prompt?: string; imageUrl?: string }>): Promise<ProactiveSuggestion | null> {
    if (!this.enabled || generations.length < 3) return null;

    // Analyze prompts for common patterns
    const prompts = generations
      .map(g => g.prompt)
      .filter((p): p is string => !!p && p.length > 0);

    if (prompts.length < 3) return null;

    // Look for repeated style keywords
    const styleKeywords: Record<string, number> = {};
    prompts.forEach(prompt => {
      const words = prompt.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 4) { // Only count substantial words
          styleKeywords[word] = (styleKeywords[word] || 0) + 1;
        }
      });
    });

    // Find most common style words (appearing in 2+ prompts)
    const commonStyles = Object.entries(styleKeywords)
      .filter(([_, count]) => count >= 2)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3)
      .map(([word]) => word);

    if (commonStyles.length === 0) return null;

    const suggestion = `I notice you often use "${commonStyles.join('", "')}" in your prompts. Would you like me to create a style preset based on this pattern?`;

    return this.createSuggestion({
      triggerType: 'workflow_pattern',
      suggestion,
      context: { commonStyles, generationCount: generations.length },
      priority: 'low',
    });
  }

  /**
   * Detect style drift from original concept
   */
  async detectDrift(
    originalPrompt: string,
    currentPrompt: string,
    originalImageUrl?: string,
    currentImageUrl?: string
  ): Promise<ProactiveSuggestion | null> {
    if (!this.enabled) return null;

    // Simple prompt similarity check
    const originalWords = new Set(originalPrompt.toLowerCase().split(/\s+/));
    const currentWords = new Set(currentPrompt.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...originalWords].filter(x => currentWords.has(x)));
    const union = new Set([...originalWords, ...currentWords]);
    const similarity = intersection.size / union.size;

    if (similarity < 0.3) {
      return this.createSuggestion({
        triggerType: 'style_drift',
        suggestion: 'Your current prompt differs significantly from the original concept. Would you like to return to the original direction or continue with this new approach?',
        context: { similarity, originalPrompt, currentPrompt },
        priority: 'medium',
      });
    }

    return null;
  }

  /**
   * Suggest next steps based on workflow state
   */
  async suggestNextSteps(context: TriggerContext): Promise<ProactiveSuggestion[]> {
    if (!this.enabled) return [];

    const suggestions: ProactiveSuggestion[] = [];

    // After generation, suggest upscaling or variations
    if (context.generationCount && context.generationCount > 0 && context.currentImageUrl) {
      suggestions.push(
        await this.createSuggestion({
          triggerType: 'generation_complete',
          suggestion: 'Great image! Would you like me to upscale it for higher resolution or create variations?',
          context: { imageUrl: context.currentImageUrl },
          priority: 'medium',
        }) || null
      );
    }

    // Multiple images suggest blending
    if (context.imageList && context.imageList.length >= 2) {
      suggestions.push(
        await this.createSuggestion({
          triggerType: 'multiple_images',
          suggestion: `You have ${context.imageList.length} images. Would you like to blend them together or create a campaign with multiple formats?`,
          context: { imageCount: context.imageList.length },
          priority: 'medium',
        }) || null
      );
    }

    // High iteration count suggests workflow optimization
    if (context.iterationCount && context.iterationCount >= 5) {
      suggestions.push(
        await this.createSuggestion({
          triggerType: 'iteration_count',
          suggestion: `You've iterated ${context.iterationCount} times. Would you like me to analyze what's working and suggest a more direct approach?`,
          context: { iterationCount: context.iterationCount },
          priority: 'high',
        }) || null
      );
    }

    return suggestions.filter((s): s is ProactiveSuggestion => s !== null);
  }

  /**
   * Create and save a suggestion to the database
   */
  private async createSuggestion(params: {
    triggerType: TriggerType;
    suggestion: string;
    context: Record<string, any>;
    priority: SuggestionPriority;
  }): Promise<ProactiveSuggestion | null> {
    try {
      const { data, error } = await supabase
        .from('artie_strategic_insights')
        .insert({
          user_id: this.userId,
          trigger_type: params.triggerType,
          suggestion: params.suggestion,
          context: params.context,
          priority: params.priority,
        })
        .select()
        .single();

      if (error) {
        console.error('[ProactiveArtieEngine] Error creating suggestion:', error);
        return null;
      }

      return {
        id: data.id,
        triggerType: data.trigger_type as TriggerType,
        suggestion: data.suggestion,
        context: data.context || {},
        priority: data.priority as SuggestionPriority,
        createdAt: new Date(data.created_at),
        dismissed: data.dismissed,
        actionTaken: data.action_taken,
      };
    } catch (error) {
      console.error('[ProactiveArtieEngine] Error creating suggestion:', error);
      return null;
    }
  }

  /**
   * Get active (non-dismissed) suggestions for user
   */
  async getActiveSuggestions(limit: number = 5): Promise<ProactiveSuggestion[]> {
    if (!this.enabled) return [];

    try {
      const { data, error } = await supabase
        .from('artie_strategic_insights')
        .select('*')
        .eq('user_id', this.userId)
        .eq('dismissed', false)
        .order('priority', { ascending: false }) // high priority first
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[ProactiveArtieEngine] Error fetching suggestions:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        triggerType: item.trigger_type as TriggerType,
        suggestion: item.suggestion,
        context: item.context || {},
        priority: item.priority as SuggestionPriority,
        createdAt: new Date(item.created_at),
        dismissed: item.dismissed,
        actionTaken: item.action_taken,
      }));
    } catch (error) {
      console.error('[ProactiveArtieEngine] Error fetching suggestions:', error);
      return [];
    }
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(suggestionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('artie_strategic_insights')
        .update({
          dismissed: true,
          dismissed_at: new Date().toISOString(),
        })
        .eq('id', suggestionId)
        .eq('user_id', this.userId);

      if (error) {
        console.error('[ProactiveArtieEngine] Error dismissing suggestion:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[ProactiveArtieEngine] Error dismissing suggestion:', error);
      return false;
    }
  }

  /**
   * Mark suggestion as action taken
   */
  async markActionTaken(suggestionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('artie_strategic_insights')
        .update({
          action_taken: true,
          action_taken_at: new Date().toISOString(),
        })
        .eq('id', suggestionId)
        .eq('user_id', this.userId);

      if (error) {
        console.error('[ProactiveArtieEngine] Error marking action taken:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[ProactiveArtieEngine] Error marking action taken:', error);
      return false;
    }
  }
}

/**
 * Factory function to create engine instance
 */
export async function createProactiveArtieEngine(userId: string): Promise<ProactiveArtieEngine | null> {
  try {
    // Check if proactive mode is enabled in user preferences
    const { data, error } = await supabase
      .from('profiles')
      .select('ui_preferences')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[ProactiveArtieEngine] Error checking preferences:', error);
      return null;
    }

    const preferences = data?.ui_preferences as any;
    const enabled = preferences?.experimentalFeatures?.proactiveArtie === true ||
                   preferences?.artieProactiveMode === 'enabled';

    return new ProactiveArtieEngine(userId, enabled);
  } catch (error) {
    console.error('[ProactiveArtieEngine] Error creating engine:', error);
    return null;
  }
}
