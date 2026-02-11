import { useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCanvasStore } from '@/store/canvasStore';
import type { CanvasItem, Project, Canvas } from '@/types/canvas';

const SYNC_DEBOUNCE_MS = 500;

export const useCanvasSync = (userId: string | undefined) => {
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirty = useCanvasStore(s => s.isDirty);

  // Mutation to save items
  const syncMutation = useMutation({
    mutationFn: async () => {
      const state = useCanvasStore.getState();
      if (!state.currentCanvasId || !userId) return;

      useCanvasStore.setSyncing(true);

      // Upsert all items for current canvas
      const itemsToSync = state.items
        .filter(item => item.canvas_id === state.currentCanvasId)
        .map(item => ({
          ...item,
          data: item.data as any, // JSONB
          user_id: userId,
        }));

      if (itemsToSync.length > 0) {
        const { error } = await supabase
          .from('canvas_items')
          .upsert(itemsToSync, { onConflict: 'id' });

        if (error) throw error;
      }

      // Save canvas viewport state
      const currentCanvas = state.canvases.find(c => c.id === state.currentCanvasId);
      if (currentCanvas) {
        const { error: canvasError } = await supabase
          .from('canvases')
          .update({
            zoom_level: state.zoom,
            pan_x: state.panX,
            pan_y: state.panY,
          })
          .eq('id', state.currentCanvasId);

        if (canvasError) throw canvasError;
      }
    },
    onSuccess: () => {
      useCanvasStore.markClean();
      useCanvasStore.setSyncing(false);
      useCanvasStore.setLastSynced(new Date().toISOString());
    },
    onError: (error) => {
      console.error('[Canvas Sync] Error:', error);
      useCanvasStore.setSyncing(false);
    },
  });

  // Watch isDirty and debounce sync
  useEffect(() => {
    if (!isDirty || !userId) return;

    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
    }

    syncTimer.current = setTimeout(() => {
      syncMutation.mutate();
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (syncTimer.current) {
        clearTimeout(syncTimer.current);
      }
    };
  }, [isDirty, userId, syncMutation]);

  // Load projects and canvases
  const loadProjects = useCallback(async () => {
    if (!userId) return;
    useCanvasStore.setLoading(true);

    try {
      // Fetch projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (projectsError) throw projectsError;

      if (!projects || projects.length === 0) {
        // Create default project
        const { data: newProject, error: createError } = await supabase
          .from('projects')
          .insert({ user_id: userId, name: 'My First Project' })
          .select()
          .single();

        if (createError) throw createError;

        // Create default canvas
        const { data: newCanvas, error: canvasError } = await supabase
          .from('canvases')
          .insert({
            project_id: newProject.id,
            user_id: userId,
            name: 'Canvas 1',
            order: 0,
          })
          .select()
          .single();

        if (canvasError) throw canvasError;

        useCanvasStore.hydrate({
          projects: [newProject],
          canvases: [newCanvas],
          items: [],
          currentProjectId: newProject.id,
          currentCanvasId: newCanvas.id,
        });
      } else {
        // Load first project's canvases
        const currentProject = projects[0];
        const { data: canvases, error: canvasesError } = await supabase
          .from('canvases')
          .select('*')
          .eq('project_id', currentProject.id)
          .is('deleted_at', null)
          .order('order', { ascending: true });

        if (canvasesError) throw canvasesError;

        let activeCanvas = canvases?.[0];

        if (!canvases || canvases.length === 0) {
          // Create default canvas
          const { data: newCanvas, error: canvasError } = await supabase
            .from('canvases')
            .insert({
              project_id: currentProject.id,
              user_id: userId,
              name: 'Canvas 1',
              order: 0,
            })
            .select()
            .single();

          if (canvasError) throw canvasError;
          activeCanvas = newCanvas;
        }

        // Load items for active canvas
        const { data: items, error: itemsError } = await supabase
          .from('canvas_items')
          .select('*')
          .eq('canvas_id', activeCanvas!.id)
          .is('deleted_at', null);

        if (itemsError) throw itemsError;

        useCanvasStore.hydrate({
          projects: projects as Project[],
          canvases: (canvases || [activeCanvas!]) as Canvas[],
          items: (items || []) as CanvasItem[],
          currentProjectId: currentProject.id,
          currentCanvasId: activeCanvas!.id,
        });

        // Restore viewport
        if (activeCanvas) {
          useCanvasStore.setZoom(activeCanvas.zoom_level || 1);
          useCanvasStore.setPan(activeCanvas.pan_x || 0, activeCanvas.pan_y || 0);
        }
      }
    } catch (error) {
      console.error('[Canvas Sync] Load error:', error);
      useCanvasStore.setError('Failed to load canvas data');
    } finally {
      useCanvasStore.setLoading(false);
    }
  }, [userId]);

  // Load items when canvas changes
  const loadCanvasItems = useCallback(async (canvasId: string) => {
    if (!userId) return;

    const { data: items, error } = await supabase
      .from('canvas_items')
      .select('*')
      .eq('canvas_id', canvasId)
      .is('deleted_at', null);

    if (error) {
      console.error('[Canvas Sync] Load items error:', error);
      return;
    }

    // Update store with new items (replace items for this canvas)
    const state = useCanvasStore.getState();
    const otherItems = state.items.filter(i => i.canvas_id !== canvasId);
    useCanvasStore.hydrate({
      projects: state.projects,
      canvases: state.canvases,
      items: [...otherItems, ...(items || []) as CanvasItem[]],
      currentProjectId: state.currentProjectId || undefined,
      currentCanvasId: canvasId,
    });
  }, [userId]);

  // Create new canvas
  const createCanvas = useCallback(async (projectId: string, name?: string) => {
    if (!userId) return null;

    const state = useCanvasStore.getState();
    const order = state.canvases.length;

    const { data: newCanvas, error } = await supabase
      .from('canvases')
      .insert({
        project_id: projectId,
        user_id: userId,
        name: name || `Canvas ${order + 1}`,
        order,
      })
      .select()
      .single();

    if (error) {
      console.error('[Canvas Sync] Create canvas error:', error);
      return null;
    }

    useCanvasStore.addCanvas(newCanvas as Canvas);
    useCanvasStore.setCurrentCanvas(newCanvas.id);
    return newCanvas;
  }, [userId]);

  // Force sync (for before navigation)
  const forceSync = useCallback(async () => {
    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
    }
    await syncMutation.mutateAsync();
  }, [syncMutation]);

  return {
    loadProjects,
    loadCanvasItems,
    createCanvas,
    forceSync,
    isSyncing: syncMutation.isPending,
  };
};
