/**
 * Optimistic asset save hook
 * Provides instant UI feedback when saving images
 */

import { useQueryClient } from "@tanstack/react-query";
import { notify } from "@/lib/notifications";
import { saveAsset } from "@/lib/saveAsset";

interface OptimisticAsset {
  id: string;
  image_url: string | null;
  created_at: string;
  action: string | null;
  prompt?: string | null;
  type: 'image';
  user_id: string;
  isPending?: boolean;
  analysis_data?: any;
  params?: any;
  source_urls?: any;
  thumbnail_url?: string | null;
  duration_ms?: number | null;
  share_slug?: string | null;
}

export function useOptimisticAssetSave(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['generated_assets', userId];

  const saveWithOptimisticUpdate = async (
    imageUrl: string,
    action: string,
    prompt?: string,
    sourceUrls?: string[],
    params?: any
  ) => {
    // Create optimistic asset (cast action to bypass strict type checking)
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticAsset: any = {
      id: tempId,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
      action: action,
      prompt: prompt || null,
      type: 'image',
      user_id: userId,
      isPending: true,
      analysis_data: null,
      params: null,
      source_urls: null,
      thumbnail_url: null,
      duration_ms: null,
      share_slug: null,
    };

    // Optimistically add to UI
    queryClient.setQueryData(queryKey, (old: any[] = []) => [
      optimisticAsset,
      ...old,
    ]);

    try {
      // Actual save
      const saved = await saveAsset({
        imageUrl,
        action,
        prompt,
        sourceUrls,
        params,
        skipToast: true, // We'll show our own toast
      });

      // Replace optimistic with real data
      if (saved && typeof saved === 'object') {
        queryClient.setQueryData(queryKey, (old: any[] = []) =>
          old.map(asset => 
            asset.id === tempId ? { ...asset, ...(saved as object), isPending: false } : asset
          )
        );
      }

      notify.imageSaved("My Projects");
      return saved;
    } catch (error) {
      // Rollback on error
      queryClient.setQueryData(queryKey, (old: any[] = []) =>
        old.filter(asset => asset.id !== tempId)
      );

      console.error('[OptimisticSave] Failed to save:', error);
      notify.error("Failed to save image", error instanceof Error ? error.message : undefined);
      throw error;
    }
  };

  return { saveWithOptimisticUpdate };
}
