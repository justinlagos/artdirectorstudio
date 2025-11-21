/**
 * Hook for saving assets with automatic query invalidation
 * Ensures History page updates immediately after saving
 */

import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { saveAsset, SaveAssetOptions } from "@/lib/saveAsset";

/**
 * Hook that wraps saveAsset with automatic query invalidation
 * After successful save, invalidates the generated_assets query
 * so the History page updates immediately
 */
export function useSaveAsset() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const saveAssetWithInvalidation = async (
    options: SaveAssetOptions
  ): Promise<string | null> => {
    // Pass queryClient and userId to saveAsset for automatic invalidation
    const assetId = await saveAsset({
      ...options,
      queryClient,
      userId: user?.id,
    });

    return assetId;
  };

  return { saveAsset: saveAssetWithInvalidation };
}

