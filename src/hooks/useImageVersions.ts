import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCanvasStore } from '@/store/canvasStore';

export interface ImageVersion {
  id: string;
  root_image_id: string;
  parent_version_id: string | null;
  storage_url: string | null;
  thumbnail_url: string | null;
  metadata: Record<string, unknown>;
  source_action: 'import' | 'analyze' | 'regenerate' | 'effects' | 'funlab';
  created_by: string | null;
  created_at: string;
}

export function useImageVersions(rootImageId: string | null | undefined) {
  const { user } = useAuth();
  const [versions, setVersions] = useState<ImageVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchVersions = useCallback(async () => {
    if (!rootImageId) {
      setVersions([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('image_versions')
        .select('*')
        .eq('root_image_id', rootImageId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[useImageVersions] fetch error:', error);
        return;
      }

      setVersions((data ?? []) as ImageVersion[]);
    } catch (err) {
      console.error('[useImageVersions] error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [rootImageId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const createVersion = useCallback(
    async (data: {
      root_image_id: string;
      parent_version_id?: string | null;
      storage_url: string;
      thumbnail_url?: string | null;
      metadata?: Record<string, unknown>;
      source_action: 'import' | 'analyze' | 'regenerate' | 'effects' | 'funlab';
    }) => {
      if (!user) return null;

      const { data: row, error } = await supabase
        .from('image_versions')
        .insert({
          root_image_id: data.root_image_id,
          parent_version_id: data.parent_version_id ?? null,
          storage_url: data.storage_url,
          thumbnail_url: data.thumbnail_url ?? data.storage_url,
          metadata: data.metadata ?? {},
          source_action: data.source_action,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('[useImageVersions] create error:', error);
        return null;
      }

      // Refresh versions list
      await fetchVersions();
      return row as ImageVersion;
    },
    [user, fetchVersions]
  );

  const switchVersion = useCallback(
    (itemId: string, version: ImageVersion) => {
      useCanvasStore.updateItemVersion(
        itemId,
        version.id,
        version.storage_url ?? ''
      );
    },
    []
  );

  return { versions, isLoading, createVersion, switchVersion, refetch: fetchVersions };
}
