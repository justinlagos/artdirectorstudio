import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to track when user takes satisfaction actions
 * and trigger style preset capture prompt
 */
export function useStylePresetCapture() {
  const { user } = useAuth();
  const [shouldShowCapture, setShouldShowCapture] = useState(false);
  const [captureData, setCaptureData] = useState<{
    imageUrl: string;
    prompt: string;
    options: any;
  } | null>(null);

  /**
   * Track satisfaction action (save, share, upscale)
   */
  const trackSatisfaction = (imageUrl: string, prompt: string, options: any) => {
    if (!user) return;

    // Check if user has already been prompted for this image
    const promptKey = `preset-capture-${imageUrl}`;
    const hasBeenPrompted = localStorage.getItem(promptKey);
    
    if (hasBeenPrompted) return;

    // Show capture prompt
    setCaptureData({ imageUrl, prompt, options });
    setShouldShowCapture(true);
  };

  /**
   * Dismiss capture prompt
   */
  const dismissCapture = (imageUrl: string) => {
    const promptKey = `preset-capture-${imageUrl}`;
    localStorage.setItem(promptKey, 'true');
    setShouldShowCapture(false);
    setCaptureData(null);
  };

  /**
   * Handle preset captured
   */
  const handlePresetCaptured = (imageUrl: string) => {
    const promptKey = `preset-capture-${imageUrl}`;
    localStorage.setItem(promptKey, 'true');
    setShouldShowCapture(false);
    setCaptureData(null);
  };

  return {
    shouldShowCapture,
    captureData,
    trackSatisfaction,
    dismissCapture,
    handlePresetCaptured,
  };
}
