/**
 * Optimistic UI update hook
 * Provides instant feedback while waiting for server response
 */

import { useQueryClient, useMutation, UseMutationOptions } from "@tanstack/react-query";
import { notify } from "@/lib/notifications";

interface OptimisticUpdateConfig<TData, TVariables> {
  queryKey: any[];
  mutationFn: (variables: TVariables) => Promise<TData>;
  onOptimisticUpdate?: (oldData: any, variables: TVariables) => any;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Custom hook for mutations with optimistic updates
 * 
 * @example
 * const saveMutation = useOptimisticMutation({
 *   queryKey: ['generated_assets', userId],
 *   mutationFn: (imageUrl: string) => saveAsset(imageUrl),
 *   onOptimisticUpdate: (oldAssets, newImageUrl) => [
 *     { id: `temp-${Date.now()}`, image_url: newImageUrl, isPending: true },
 *     ...oldAssets
 *   ],
 *   successMessage: "Image saved!",
 * });
 */
export function useOptimisticMutation<TData = unknown, TVariables = unknown>({
  queryKey,
  mutationFn,
  onOptimisticUpdate,
  onSuccess,
  onError,
  successMessage,
  errorMessage,
}: OptimisticUpdateConfig<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    
    // Optimistic update before request
    onMutate: async (variables) => {
      if (!onOptimisticUpdate) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update
      queryClient.setQueryData(queryKey, (old: any) => 
        onOptimisticUpdate(old, variables)
      );

      return { previousData };
    },

    // On success, replace optimistic data with real data
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey });
      
      if (successMessage) {
        notify.success(successMessage);
      }
      
      onSuccess?.(data, variables);
    },

    // On error, rollback to previous data
    onError: (error: Error, variables, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      
      const message = errorMessage || error.message || "Operation failed";
      notify.error(message);
      
      onError?.(error, variables);
    },
  });
}

/**
 * Hook for optimistic list operations (add/remove/update items)
 */
export function useOptimisticList<TItem extends { id: string }>(queryKey: any[]) {
  const queryClient = useQueryClient();

  const addItem = (newItem: TItem) => {
    queryClient.setQueryData(queryKey, (old: TItem[] = []) => [newItem, ...old]);
  };

  const removeItem = (itemId: string) => {
    queryClient.setQueryData(queryKey, (old: TItem[] = []) => 
      old.filter(item => item.id !== itemId)
    );
  };

  const updateItem = (itemId: string, updates: Partial<TItem>) => {
    queryClient.setQueryData(queryKey, (old: TItem[] = []) =>
      old.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    );
  };

  const replaceItem = (tempId: string, realItem: TItem) => {
    queryClient.setQueryData(queryKey, (old: TItem[] = []) =>
      old.map(item => 
        item.id === tempId ? realItem : item
      )
    );
  };

  return {
    addItem,
    removeItem,
    updateItem,
    replaceItem,
  };
}
