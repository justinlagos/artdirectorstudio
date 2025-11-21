import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { saveAsset, ensureAssetSaved, type SaveAssetOptions } from "@/lib/saveAsset";

/**
 * Hook for saving assets with automatic QueryClient and user context
 * Use this hook instead of calling ensureAssetSaved directly
 */
export function useSaveAsset() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const saveAssetWithContext = async (options: Omit<SaveAssetOptions, 'queryClient' | 'userId'>) => {
    return ensureAssetSaved({
      ...options,
      queryClient,
      userId: user?.id,
    });
  };

  return {
    saveAsset: saveAssetWithContext,
    ensureAssetSaved: saveAssetWithContext,
  };
}
