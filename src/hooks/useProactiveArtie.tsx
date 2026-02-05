import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import {
  createProactiveArtieEngine,
  ProactiveArtieEngine,
  type ProactiveSuggestion,
  type TriggerContext,
} from '@/lib/intelligence/proactiveArtieEngine';

/**
 * Hook for managing proactive Artie suggestions
 */
export function useProactiveArtie() {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const [engine, setEngine] = useState<ProactiveArtieEngine | null>(null);
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize engine when user or preferences change
  useEffect(() => {
    if (!user) {
      setEngine(null);
      setSuggestions([]);
      return;
    }

    const initEngine = async () => {
      const newEngine = await createProactiveArtieEngine(user.id);
      setEngine(newEngine);
      
      if (newEngine?.isEnabled()) {
        // Load active suggestions
        const active = await newEngine.getActiveSuggestions(5);
        setSuggestions(active);
      }
    };

    initEngine();
  }, [user, preferences.experimentalFeatures?.proactiveArtie, preferences.artieProactiveMode]);

  /**
   * Trigger proactive analysis based on context
   */
  const triggerAnalysis = useCallback(async (triggerType: string, context: TriggerContext) => {
    if (!engine || !engine.isEnabled()) return;

    setLoading(true);
    try {
      let newSuggestion: ProactiveSuggestion | null = null;

      switch (triggerType) {
        case 'brief_uploaded':
          if (context.briefContent) {
            newSuggestion = await engine.analyzeBrief(context.briefContent);
          }
          break;

        case 'generation_complete':
          const nextSteps = await engine.suggestNextSteps(context);
          if (nextSteps.length > 0) {
            newSuggestion = nextSteps[0]; // Take first suggestion
          }
          break;

        case 'style_drift':
          if (context.currentImageUrl && context.previousImageUrl) {
            // This would need prompt data - simplified for now
            newSuggestion = await engine.detectDrift(
              context.previousImageUrl,
              context.currentImageUrl || '',
              context.previousImageUrl,
              context.currentImageUrl
            );
          }
          break;

        case 'workflow_pattern':
          if (context.imageList && context.imageList.length >= 3) {
            newSuggestion = await engine.detectStylePattern(
              context.imageList.map(img => ({ prompt: img.prompt, imageUrl: img.url }))
            );
          }
          break;
      }

      if (newSuggestion) {
        setSuggestions((prev) => [newSuggestion!, ...prev].slice(0, 5));
      }
    } catch (error) {
      console.error('[useProactiveArtie] Error in triggerAnalysis:', error);
    } finally {
      setLoading(false);
    }
  }, [engine]);

  /**
   * Dismiss a suggestion
   */
  const dismissSuggestion = useCallback(async (suggestionId: string) => {
    if (!engine) return;

    const success = await engine.dismissSuggestion(suggestionId);
    if (success) {
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
    }
  }, [engine]);

  /**
   * Mark suggestion as action taken
   */
  const markActionTaken = useCallback(async (suggestionId: string) => {
    if (!engine) return;

    const success = await engine.markActionTaken(suggestionId);
    if (success) {
      setSuggestions((prev) =>
        prev.map((s) => (s.id === suggestionId ? { ...s, actionTaken: true } : s))
      );
    }
  }, [engine]);

  /**
   * Refresh suggestions
   */
  const refreshSuggestions = useCallback(async () => {
    if (!engine || !engine.isEnabled()) return;

    setLoading(true);
    try {
      const active = await engine.getActiveSuggestions(5);
      setSuggestions(active);
    } catch (error) {
      console.error('[useProactiveArtie] Error refreshing suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, [engine]);

  return {
    engine,
    suggestions,
    loading,
    isEnabled: engine?.isEnabled() || false,
    triggerAnalysis,
    dismissSuggestion,
    markActionTaken,
    refreshSuggestions,
  };
}
