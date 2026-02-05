import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GenerationOptions } from '@/components/ImageGenerationDialog';
import { useUserPreferences } from './useUserPreferences';

const STORAGE_KEY = 'last-generation-options';
const USAGE_COUNTS_KEY = 'generation-usage-counts';

type StoredOptions = Omit<GenerationOptions, 'referenceImageUrl' | 'continuationStrength' | 'previousPrompt'>;

interface UsageCounts {
  quality: Record<string, number>;
  aspectRatio: Record<string, number>;
}

const THRESHOLD_FOR_AUTO_PREFERENCE = 5;

export const useSmartDefaults = () => {
  const { preferences, update: updatePreferences } = useUserPreferences();
  const [lastOptions, setLastOptions] = useState<StoredOptions>({
    quality: 'auto',
    size: '1024x1024',
    background: 'auto',
  });

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setLastOptions(parsed);
      } catch (e) {
        console.error('Failed to parse last options:', e);
      }
    }
  }, []);

  // Merge with preferences from database (preferred over localStorage)
  useEffect(() => {
    const dbLastUsed = preferences.generation?.lastUsedSettings;
    if (dbLastUsed) {
      setLastOptions((prev) => ({
        ...prev,
        quality: dbLastUsed.quality || prev.quality,
        size: dbLastUsed.aspectRatio 
          ? getSizeFromAspectRatio(dbLastUsed.aspectRatio) 
          : prev.size,
        background: dbLastUsed.background || prev.background,
      }));
    }
  }, [preferences.generation?.lastUsedSettings]);

  // Get smart defaults combining localStorage and preferences
  const smartDefaults = useMemo((): StoredOptions => {
    const preferredQuality = preferences.generation?.preferredQuality;
    const preferredRatio = preferences.generation?.preferredRatio;
    
    return {
      quality: preferredQuality || lastOptions.quality,
      size: preferredRatio 
        ? getSizeFromAspectRatio(preferredRatio)
        : lastOptions.size,
      background: lastOptions.background,
    };
  }, [preferences.generation, lastOptions]);

  const saveOptions = useCallback((options: GenerationOptions) => {
    const toStore: StoredOptions = {
      quality: options.quality,
      size: options.size,
      background: options.background,
    };
    
    // Save to localStorage immediately
    setLastOptions(toStore);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));

    // Track usage counts
    const usageCountsStr = localStorage.getItem(USAGE_COUNTS_KEY);
    const usageCounts: UsageCounts = usageCountsStr 
      ? JSON.parse(usageCountsStr)
      : { quality: {}, aspectRatio: {} };

    // Increment quality usage
    const qualityKey = options.quality;
    usageCounts.quality[qualityKey] = (usageCounts.quality[qualityKey] || 0) + 1;

    // Increment aspect ratio usage
    const aspectRatio = options.aspectRatio || '1:1';
    usageCounts.aspectRatio[aspectRatio] = (usageCounts.aspectRatio[aspectRatio] || 0) + 1;

    localStorage.setItem(USAGE_COUNTS_KEY, JSON.stringify(usageCounts));

    // Check if we should auto-set as preferred (after 5 uses)
    const qualityCount = usageCounts.quality[qualityKey] || 0;
    const ratioCount = usageCounts.aspectRatio[aspectRatio] || 0;

    const updates: any = {
      generation: {
        lastUsedSettings: {
          quality: options.quality,
          aspectRatio: aspectRatio,
          background: options.background,
        },
      },
    };

    // Auto-set preferred quality if threshold reached
    if (qualityCount >= THRESHOLD_FOR_AUTO_PREFERENCE) {
      updates.generation.preferredQuality = qualityKey;
    }

    // Auto-set preferred ratio if threshold reached
    if (ratioCount >= THRESHOLD_FOR_AUTO_PREFERENCE) {
      updates.generation.preferredRatio = aspectRatio;
    }

    // Save to database asynchronously (don't block)
    updatePreferences(updates);
  }, [updatePreferences]);

  /**
   * Get last used settings for "Use Last Settings" button
   */
  const getLastUsedSettings = useCallback((): Partial<GenerationOptions> => {
    const lastUsed = preferences.generation?.lastUsedSettings;
    if (lastUsed) {
      return {
        quality: lastUsed.quality,
        aspectRatio: lastUsed.aspectRatio,
        background: lastUsed.background,
      };
    }
    return smartDefaults;
  }, [preferences.generation, smartDefaults]);

  return { 
    lastOptions: smartDefaults, 
    saveOptions,
    getLastUsedSettings,
  };
};

/**
 * Helper to convert aspect ratio to size string
 */
function getSizeFromAspectRatio(ratio: string): string {
  const ratioToSize: Record<string, string> = {
    '1:1': '1024x1024',
    '4:5': '1024x1280',
    '3:2': '1536x1024',
    '2:3': '1024x1536',
    '16:9': '1920x1080',
    '9:16': '1080x1920',
    '4:3': '1536x1152',
    '3:4': '1152x1536',
  };
  return ratioToSize[ratio] || '1024x1024';
}
