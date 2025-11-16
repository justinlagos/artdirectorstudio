/**
 * User Behavior Learning System
 * 
 * Observes user behavior and builds preference profiles:
 * - What they upscale
 * - What they save
 * - What they blend
 * - What they reject
 * - What edits they frequently apply
 * - The mood/style they gravitate to
 * - The industries they design for
 */

import { supabase } from "@/integrations/supabase/client";
import type { ImageUnderstanding } from './imageUnderstanding';

export interface UserPreferences {
  preferredStyles: string[];
  preferredColors: string[];
  preferredLighting: string | null;
  preferredTone: string | null;
  preferredSubjectMatter: string[];
  industries: string[];
  editingPatterns: {
    frequentAdjustments: string[];
    commonEdits: string[];
  };
  qualityPreferences: {
    upscaleFrequency: number;
    blendFrequency: number;
    editFrequency: number;
  };
  lastUpdated: string;
}

/**
 * Learn from user actions and update preferences
 */
export async function learnFromUserAction(
  userId: string,
  action: 'upscale' | 'blend' | 'edit' | 'save' | 'reject',
  imageUrl?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    // Get current preferences
    const preferences = await getUserPreferences(userId);

    // Analyze image if provided
    let understanding: ImageUnderstanding | null = null;
    if (imageUrl) {
      // Import dynamically to avoid circular dependencies
      const { getCachedUnderstanding } = await import('./imageUnderstanding');
      understanding = await getCachedUnderstanding(imageUrl);
    }

    // Update preferences based on action
    const updated = updatePreferencesFromAction(preferences, action, understanding, metadata);

    // Store updated preferences
    await storeUserPreferences(userId, updated);
  } catch (error) {
    console.error('[UserBehavior] Error learning from action:', error);
  }
}

/**
 * Get user preferences (with defaults)
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  try {
    // Check if preferences exist in database
    // For now, we'll use a simple approach - store in user metadata or separate table
    // In production, you might want a dedicated user_preferences table
    
    const { data: assets } = await supabase
      .from('generated_assets')
      .select('action, analysis_data, params, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100); // Analyze last 100 actions

    if (!assets || assets.length === 0) {
      return getDefaultPreferences();
    }

    // Analyze user behavior from assets
    return analyzeBehaviorFromAssets(assets);
  } catch (error) {
    console.error('[UserBehavior] Error getting preferences:', error);
    return getDefaultPreferences();
  }
}

/**
 * Analyze behavior from user's assets
 */
function analyzeBehaviorFromAssets(assets: any[]): UserPreferences {
  const preferences: UserPreferences = getDefaultPreferences();

  // Count actions
  const actionCounts = {
    upscale: 0,
    blend: 0,
    edit: 0,
    save: 0,
  };

  const styles: string[] = [];
  const colors: string[] = [];
  const subjects: string[] = [];
  const adjustments: string[] = [];

  assets.forEach(asset => {
    // Count actions
    if (asset.action === 'upscale') actionCounts.upscale++;
    if (asset.action === 'blend') actionCounts.blend++;
    if (asset.action === 'edit') actionCounts.edit++;
    if (asset.action === 'generate') actionCounts.save++;

    // Extract style preferences
    const analysis = asset.analysis_data as any;
    if (analysis?.deepUnderstanding) {
      const understanding = analysis.deepUnderstanding as ImageUnderstanding;
      if (understanding.style.category) {
        styles.push(understanding.style.category);
      }
      if (understanding.colorPalette.dominant.length > 0) {
        colors.push(...understanding.colorPalette.dominant);
      }
      if (understanding.subject) {
        subjects.push(understanding.subject);
      }
    }

    // Extract edit patterns
    const params = asset.params as any;
    if (params?.adjustments) {
      Object.keys(params.adjustments).forEach(adj => {
        adjustments.push(adj);
      });
    }
  });

  // Calculate frequencies
  preferences.qualityPreferences = {
    upscaleFrequency: actionCounts.upscale / assets.length,
    blendFrequency: actionCounts.blend / assets.length,
    editFrequency: actionCounts.edit / assets.length,
  };

  // Get most common styles
  preferences.preferredStyles = getMostCommon(styles, 3);
  preferences.preferredColors = getMostCommon(colors, 3);
  preferences.preferredSubjectMatter = getMostCommon(subjects, 5);
  preferences.editingPatterns.frequentAdjustments = getMostCommon(adjustments, 5);

  preferences.lastUpdated = new Date().toISOString();

  return preferences;
}

/**
 * Update preferences from a single action
 */
function updatePreferencesFromAction(
  current: UserPreferences,
  action: string,
  understanding: ImageUnderstanding | null,
  metadata?: Record<string, unknown>
): UserPreferences {
  const updated = { ...current };

  // Update action frequencies
  if (action === 'upscale') {
    updated.qualityPreferences.upscaleFrequency += 0.1;
  } else if (action === 'blend') {
    updated.qualityPreferences.blendFrequency += 0.1;
  } else if (action === 'edit') {
    updated.qualityPreferences.editFrequency += 0.1;
  }

  // Learn from image understanding
  if (understanding) {
    // Add style if not already present
    if (understanding.style.category && !updated.preferredStyles.includes(understanding.style.category)) {
      updated.preferredStyles.push(understanding.style.category);
      // Keep only top 5
      updated.preferredStyles = updated.preferredStyles.slice(0, 5);
    }

    // Add colors
    understanding.colorPalette.dominant.forEach(color => {
      if (!updated.preferredColors.includes(color)) {
        updated.preferredColors.push(color);
      }
    });
    updated.preferredColors = updated.preferredColors.slice(0, 5);

    // Update lighting preference
    if (understanding.lighting.type) {
      updated.preferredLighting = understanding.lighting.type;
    }

    // Add subject matter
    if (understanding.subject && !updated.preferredSubjectMatter.includes(understanding.subject)) {
      updated.preferredSubjectMatter.push(understanding.subject);
      updated.preferredSubjectMatter = updated.preferredSubjectMatter.slice(0, 10);
    }
  }

  // Learn from metadata
  if (metadata) {
    if (metadata.style && typeof metadata.style === 'string') {
      if (!updated.preferredStyles.includes(metadata.style)) {
        updated.preferredStyles.push(metadata.style);
        updated.preferredStyles = updated.preferredStyles.slice(0, 5);
      }
    }
  }

  updated.lastUpdated = new Date().toISOString();

  return updated;
}

/**
 * Store user preferences
 */
async function storeUserPreferences(
  userId: string,
  preferences: UserPreferences
): Promise<void> {
  try {
    // Store in user metadata or dedicated table
    // For now, we'll use a simple approach - store in a JSON column
    // In production, consider a dedicated user_preferences table
    
    // This is a placeholder - implement based on your database schema
    // You might want to create a user_preferences table or store in profiles table
    console.log('[UserBehavior] Storing preferences for user:', userId);
  } catch (error) {
    console.error('[UserBehavior] Error storing preferences:', error);
  }
}

/**
 * Get default preferences
 */
function getDefaultPreferences(): UserPreferences {
  return {
    preferredStyles: [],
    preferredColors: [],
    preferredLighting: null,
    preferredTone: null,
    preferredSubjectMatter: [],
    industries: [],
    editingPatterns: {
      frequentAdjustments: [],
      commonEdits: [],
    },
    qualityPreferences: {
      upscaleFrequency: 0,
      blendFrequency: 0,
      editFrequency: 0,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get most common items from array
 */
function getMostCommon(items: string[], limit: number): string[] {
  const counts: Record<string, number> = {};
  items.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([item]) => item);
}

/**
 * Get personalized prompt suggestions based on preferences
 */
export function getPersonalizedSuggestions(preferences: UserPreferences): string[] {
  const suggestions: string[] = [];

  if (preferences.preferredStyles.length > 0) {
    suggestions.push(`Try ${preferences.preferredStyles[0]} style`);
  }

  if (preferences.preferredColors.length > 0) {
    suggestions.push(`Use ${preferences.preferredColors[0]} color palette`);
  }

  if (preferences.preferredLighting) {
    suggestions.push(`Apply ${preferences.preferredLighting} lighting`);
  }

  if (preferences.editingPatterns.frequentAdjustments.length > 0) {
    suggestions.push(`Adjust ${preferences.editingPatterns.frequentAdjustments[0]}`);
  }

  return suggestions;
}

