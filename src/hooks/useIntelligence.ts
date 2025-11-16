/**
 * Intelligence Framework Hook
 * 
 * Provides easy access to intelligence features:
 * - Image understanding
 * - Prompt synthesis
 * - User behavior learning
 * - Visual troubleshooting
 */

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  analyzeImageDeep,
  getCachedUnderstanding,
  type ImageUnderstanding,
} from '@/lib/intelligence/imageUnderstanding';
import {
  synthesizeContextLockedPrompt,
  generateArtDirectorPrompt,
  analyzePromptDrift,
  type PromptContext,
  type SynthesizedPrompt,
} from '@/lib/intelligence/promptIntelligence';
import {
  getUserPreferences,
  learnFromUserAction,
  getPersonalizedSuggestions,
  type UserPreferences,
} from '@/lib/intelligence/userBehavior';
import {
  detectVisualIssues,
  getQuickFixes,
  type VisualIssue,
} from '@/lib/intelligence/visualTroubleshooting';

export function useIntelligence() {
  const { user } = useAuth();

  /**
   * Analyze image deeply
   */
  const analyzeImage = useCallback(async (imageUrl: string): Promise<ImageUnderstanding | null> => {
    try {
      // Try cached first
      const cached = await getCachedUnderstanding(imageUrl);
      if (cached) return cached;

      // Analyze deeply
      return await analyzeImageDeep(imageUrl);
    } catch (error) {
      console.error('[useIntelligence] Error analyzing image:', error);
      return null;
    }
  }, []);

  /**
   * Synthesize intelligent prompt
   */
  const synthesizePrompt = useCallback(async (
    userPrompt: string,
    imageUrl?: string,
    intent?: PromptContext['intent']
  ): Promise<SynthesizedPrompt | null> => {
    try {
      let understanding: ImageUnderstanding | undefined;
      let userPreferences: UserPreferences | undefined;

      // Get image understanding if URL provided
      if (imageUrl) {
        understanding = await analyzeImage(imageUrl);
      }

      // Get user preferences if user is logged in
      if (user) {
        userPreferences = await getUserPreferences(user.id);
      }

      return synthesizeContextLockedPrompt({
        userPrompt,
        imageUnderstanding: understanding,
        userPreferences,
        intent: intent || 'variation',
      });
    } catch (error) {
      console.error('[useIntelligence] Error synthesizing prompt:', error);
      return null;
    }
  }, [user, analyzeImage]);

  /**
   * Get art director prompt from image
   */
  const getArtDirectorPrompt = useCallback(async (
    imageUrl: string,
    userIntent?: string
  ): Promise<string | null> => {
    try {
      const understanding = await analyzeImage(imageUrl);
      if (!understanding) return null;

      return generateArtDirectorPrompt(understanding, userIntent);
    } catch (error) {
      console.error('[useIntelligence] Error getting art director prompt:', error);
      return null;
    }
  }, [analyzeImage]);

  /**
   * Track user action for learning
   */
  const trackAction = useCallback(async (
    action: 'upscale' | 'blend' | 'edit' | 'save' | 'reject',
    imageUrl?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!user) return;

    try {
      await learnFromUserAction(user.id, action, imageUrl, metadata);
    } catch (error) {
      console.error('[useIntelligence] Error tracking action:', error);
    }
  }, [user]);

  /**
   * Get personalized suggestions
   */
  const getSuggestions = useCallback(async (): Promise<string[]> => {
    if (!user) return [];

    try {
      const preferences = await getUserPreferences(user.id);
      return getPersonalizedSuggestions(preferences);
    } catch (error) {
      console.error('[useIntelligence] Error getting suggestions:', error);
      return [];
    }
  }, [user]);

  /**
   * Get visual issues and fixes
   */
  const getVisualFixes = useCallback(async (imageUrl: string): Promise<VisualIssue[]> => {
    try {
      const understanding = await analyzeImage(imageUrl);
      if (!understanding) return [];

      return detectVisualIssues(understanding);
    } catch (error) {
      console.error('[useIntelligence] Error getting visual fixes:', error);
      return [];
    }
  }, [analyzeImage]);

  /**
   * Get quick fixes as actions
   */
  const getQuickFixActions = useCallback(async (imageUrl: string) => {
    try {
      const understanding = await analyzeImage(imageUrl);
      if (!understanding) return [];

      return getQuickFixes(understanding);
    } catch (error) {
      console.error('[useIntelligence] Error getting quick fixes:', error);
      return [];
    }
  }, [analyzeImage]);

  /**
   * Check prompt drift
   */
  const checkDrift = useCallback((
    originalPrompt: string,
    newPrompt: string,
    imageUrl?: string
  ) => {
    return analyzePromptDrift(originalPrompt, newPrompt);
  }, []);

  return {
    analyzeImage,
    synthesizePrompt,
    getArtDirectorPrompt,
    trackAction,
    getSuggestions,
    getVisualFixes,
    getQuickFixActions,
    checkDrift,
  };
}

