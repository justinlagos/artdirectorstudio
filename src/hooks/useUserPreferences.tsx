import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptimizedQuery } from './useOptimizedQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { UserUIPreferences, DEFAULT_USER_PREFERENCES } from '@/types/userPreferences';
import { DEFAULT_USER_PREFERENCES as DEFAULT_PREFS } from '@/types/userPreferences';
import { toast } from 'sonner';

/**
 * Hook for managing user UI preferences with optimistic updates and automatic sync
 */
export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch preferences from database
  const {
    data: preferences,
    isLoading,
    error,
  } = useOptimizedQuery({
    queryKey: ['userPreferences', user?.id],
    queryFn: async (): Promise<UserUIPreferences> => {
      if (!user) {
        return DEFAULT_PREFS;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('ui_preferences')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[useUserPreferences] Error fetching preferences:', error);
        return DEFAULT_PREFS;
      }

      // Merge with defaults to ensure all fields exist
      const result = {
        ...DEFAULT_PREFS,
        ...(data?.ui_preferences as UserUIPreferences),
      };
      return result;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Keep previous data during refetch to prevent flickering
    // CRITICAL: Return DEFAULT_PREFS if no previous data to prevent undefined state
    placeholderData: (previousData) => {
      // Return previous data if available, otherwise return defaults to prevent undefined
      return previousData || DEFAULT_PREFS;
    },
    // Ensure data is never undefined during transitions
    gcTime: Infinity, // Keep cache forever to prevent data loss
    // CRITICAL: Don't refetch on mount if we have data - this prevents resetting optimistic updates
    refetchOnMount: false,
    // CRITICAL: Don't refetch on window focus - this prevents resetting optimistic updates
    refetchOnWindowFocus: false,
  });

  // Mutation for updating preferences
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<UserUIPreferences>) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get current preferences
      const { data: current } = await supabase
        .from('profiles')
        .select('ui_preferences')
        .eq('id', user.id)
        .single();

      const currentPrefs = (current?.ui_preferences as UserUIPreferences) || DEFAULT_PREFS;

      // Deep merge updates
      const mergedPrefs: UserUIPreferences = {
        ...currentPrefs,
        ...updates,
        experimentalFeatures: {
          ...currentPrefs.experimentalFeatures,
          ...updates.experimentalFeatures,
        },
        generation: {
          ...currentPrefs.generation,
          ...updates.generation,
          lastUsedSettings: {
            ...currentPrefs.generation?.lastUsedSettings,
            ...updates.generation?.lastUsedSettings,
          },
        },
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          ui_preferences: mergedPrefs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      return mergedPrefs;
    },
    onMutate: async (updates) => {
      console.log('[useUserPreferences] onMutate: starting optimistic update', { updates, workspaceModeUpdate: updates.workspaceMode });
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['userPreferences', user?.id] });

      const previousPrefs = queryClient.getQueryData<UserUIPreferences>([
        'userPreferences',
        user?.id,
      ]);

      console.log('[useUserPreferences] onMutate: got previous prefs', { hasPreviousPrefs: !!previousPrefs, previousWorkspaceMode: previousPrefs?.workspaceMode });

      // CRITICAL: Always create optimistic prefs, even if previousPrefs is undefined
      // Use DEFAULT_PREFS as base to ensure we always have valid data
      const basePrefs = previousPrefs || DEFAULT_PREFS;
      const optimisticPrefs: UserUIPreferences = {
        ...basePrefs,
        ...updates,
        experimentalFeatures: {
          ...basePrefs.experimentalFeatures,
          ...updates.experimentalFeatures,
        },
        generation: {
          ...basePrefs.generation,
          ...updates.generation,
          lastUsedSettings: {
            ...basePrefs.generation?.lastUsedSettings,
            ...updates.generation?.lastUsedSettings,
          },
        },
      };

      console.log('[useUserPreferences] onMutate: setting optimistic prefs', { optimisticWorkspaceMode: optimisticPrefs.workspaceMode, hadPreviousPrefs: !!previousPrefs });
      // CRITICAL: Set query data and mark as fresh to prevent refetches
      queryClient.setQueryData(['userPreferences', user?.id], optimisticPrefs);
      // Also update the ref immediately in Index component by ensuring the query data is fresh
      console.log('[useUserPreferences] Query data set', { workspaceMode: optimisticPrefs.workspaceMode });

      return { previousPrefs };
    },
    onSuccess: (data) => {
      console.log('[useUserPreferences] onSuccess: mutation succeeded', { workspaceMode: data.workspaceMode });
      // Update query data with server response to ensure consistency
      // This ensures the optimistic update is confirmed with actual server data
      // CRITICAL: Don't invalidate or refetch - just update the data directly
      queryClient.setQueryData(['userPreferences', user?.id], data);
    },
    onError: (err, updates, context) => {
      // Harden against preference bounce: if workspaceMode was updated, don't roll it back
      // Keep the optimistic mode and show a toast instead
      const isWorkspaceModeUpdate = 'workspaceMode' in updates;
      
      if (context?.previousPrefs) {
        if (isWorkspaceModeUpdate) {
          // Don't rollback workspaceMode - keep current optimistic value
          const currentPrefs = queryClient.getQueryData<UserUIPreferences>([
            'userPreferences',
            user?.id,
          ]);
          
          if (currentPrefs) {
            // Merge previous prefs with current workspaceMode to preserve the optimistic update
            const preservedPrefs: UserUIPreferences = {
              ...context.previousPrefs,
              workspaceMode: currentPrefs.workspaceMode,
            };
            queryClient.setQueryData(['userPreferences', user?.id], preservedPrefs);
          } else {
            // Fallback: keep previous prefs but preserve workspaceMode from updates
            const preservedPrefs: UserUIPreferences = {
              ...context.previousPrefs,
              workspaceMode: updates.workspaceMode as 'classic' | 'auto',
            };
            queryClient.setQueryData(['userPreferences', user?.id], preservedPrefs);
          }
          
          toast.error('Failed to save view mode. Using local setting.');
        } else {
          // For non-workspaceMode updates, rollback normally
          queryClient.setQueryData(['userPreferences', user?.id], context.previousPrefs);
        }
      }
      console.error('[useUserPreferences] Error updating preferences:', err);
    },
    onSettled: () => {
      // Don't refetch immediately - the optimistic update already handles the UI
      // Only refetch if there was an error to ensure consistency
      // This prevents flickering when switching view modes
    },
  });

  /**
   * Get a preference value by path (e.g., 'workspaceMode', 'generation.preferredQuality')
   */
  const get = useCallback(
    <T = any>(path: string): T | undefined => {
      if (!preferences) return undefined;

      const keys = path.split('.');
      let value: any = preferences;

      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return undefined;
        }
      }

      return value as T;
    },
    [preferences]
  );

  /**
   * Set a preference value by path
   */
  const set = useCallback(
    (path: string, value: any) => {
      const keys = path.split('.');
      const updates: any = {};

      // Build nested object
      let current = updates;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;

      updateMutation.mutate(updates);
    },
    [updateMutation]
  );

  /**
   * Update multiple preferences at once
   */
  const update = useCallback(
    (updates: Partial<UserUIPreferences>) => {
      updateMutation.mutate(updates);
    },
    [updateMutation]
  );

  // Always return preferences, never undefined
  // Use placeholderData to ensure we always have data during refetches
  // CRITICAL: preferences should never be undefined due to placeholderData returning DEFAULT_PREFS
  const safePreferences = preferences ?? DEFAULT_PREFS;
  
  return {
    preferences: safePreferences,
    isLoading,
    error,
    get,
    set,
    update,
    isUpdating: updateMutation.isPending,
  };
}
