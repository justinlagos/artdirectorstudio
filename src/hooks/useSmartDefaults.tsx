import { useState, useEffect } from 'react';
import type { GenerationOptions } from '@/components/ImageGenerationDialog';

const STORAGE_KEY = 'last-generation-options';

type StoredOptions = Omit<GenerationOptions, 'referenceImageUrl' | 'continuationStrength' | 'previousPrompt'>;

export const useSmartDefaults = () => {
  const [lastOptions, setLastOptions] = useState<StoredOptions>({
    quality: 'auto',
    size: '1024x1024',
    background: 'auto',
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setLastOptions(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse last options:', e);
      }
    }
  }, []);

  const saveOptions = (options: GenerationOptions) => {
    const toStore: StoredOptions = {
      quality: options.quality,
      size: options.size,
      background: options.background,
    };
    setLastOptions(toStore);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  };

  return { lastOptions, saveOptions };
};
