import { useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCanvasStore } from '@/store/canvasStore';
import { debugLog, debugError } from '@/lib/debug';
import type { CanvasItem, Project, Canvas } from '@/types/canvas';

const SYNC_DEBOUNCE_MS = 500;
const LAST_CANVAS_KEY = 'ads_last_canvas_id';

const didInitGlobal = { current: false };

function mergeItemsByTimestamp(
  localItems: CanvasItem[],
  serverItems: CanvasItem[]
): CanvasItem[] {
  const merged = new Map<string, CanvasItem>();
  
  for (const item of localItems) {
    merged.set(item.id, item);
  }
  
  for (const serverItem of serverItems) {
    const localItem = merged.get(serverItem.id);
    
    if (!localItem) {
      merged.set(serverItem.id, serverItem);
      continue;
    }
    
    const localTime = new Date(localItem.updated_at).getTime();
    const serverTime = new Date(serverItem.updated_at).getTime();
    
    if (serverTime > localTime) {
      debugLog('canvasSync', { 
        action: 'server_wins', 
        itemId: serverItem.id,
        localTime,
        serverTime 
      });
      merged.set(serverItem.id, serverItem);
    } else {
      debugLog('canvasSync', { 
        action: 'local_wins', 
        itemId: localItem.id,
        localTime,
        serverTime 
      });
    }
  }
  
  return Array.from(merged.values());
}

export const useCanvasSync = (userId: string | undefined) => {
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const isDirty = useCanvasStore(s => s.isDirty);

  // Keep access token ref up-to-date for beforeunload (can't await in unload)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      accessTokenRef.current = data.session?.access_token ?? null;
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      accessTokenRef.current = session?.access_token ?? null;
    });
    return () => subscription.unsubscribe();
  }, []);

  // ---------- sync mutation ----------
  const syncMutation = useMutation({
    mutationFn: async (targetCanvasId?: string) => {
      const state = useCanvasStore.getState();
      const canvasId = targetCanvasId ?? state.currentCanvasId;
      if (!canvasId || !userId) return;

      useCanvasStore.setSyncing(true);

      // Sync items that belong to the target canvas (not "current")
      const itemsToSync = state.items
        .filter(item => item.canvas_id === canvasId)
        .map(item => ({
          id: item.id,
          canvas_id: item.canvas_id,
          user_id: userId,
          type: item.type,
          position_x: item.position_x,
          position_y: item.position_y,
          width: item.width,
          height: item.height,
          rotation: item.rotation,
          z_index: item.z_index,
          data: item.data as any,
          created_at: item.created_at,
          updated_at: item.updated_at,
          deleted_at: item.deleted_at ?? null,
          image_version_id: item.image_version_id ?? null,
          root_image_id: item.root_image_id ?? null,
        }));

      debugLog('canvasSync', {
        action: 'upsert',
        canvasId,
        itemCount: itemsToSync.length,
      });

      if (itemsToSync.length > 0) {
        const { error } = await supabase
          .from('canvas_items')
          .upsert(itemsToSync, { onConflict: 'id' });

        if (error) {
          debugError('canvasSync', { action: 'upsert_error', error: error.message, code: error.code });
          throw error;
        }
      }

      // Save canvas viewport state
      if (canvasId === state.currentCanvasId) {
        const currentCanvas = state.canvases.find(c => c.id === canvasId);
        if (currentCanvas) {
          const { error: canvasError } = await supabase
            .from('canvases')
            .update({
              zoom_level: state.zoom,
              pan_x: state.panX,
              pan_y: state.panY,
            })
            .eq('id', canvasId);

          if (canvasError) {
            debugError('canvasSync', { action: 'viewport_save_error', error: canvasError.message });
            throw canvasError;
          }
        }
      }
    },
    onSuccess: () => {
      useCanvasStore.markClean();
      useCanvasStore.setSyncing(false);
      useCanvasStore.setLastSynced(new Date().toISOString());
    },
    onError: (error) => {
      console.error('[Canvas Sync] Error:', error);
      debugError('canvasSync', { action: 'sync_error', error: String(error) });
      useCanvasStore.setSyncing(false);
    },
  });

  // ---------- debounced sync ----------
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

  // ---------- beforeunload: flush sync ----------
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = useCanvasStore.getState();
      if (!state.isDirty || !state.currentCanvasId || !userId) return;

      // Cancel debounce timer
      if (syncTimer.current) {
        clearTimeout(syncTimer.current);
      }

      // Synchronous sendBeacon for items
      const itemsToSync = state.items
        .filter(item => item.canvas_id === state.currentCanvasId)
        .map(item => ({
          id: item.id,
          canvas_id: item.canvas_id,
          user_id: userId,
          type: item.type,
          position_x: item.position_x,
          position_y: item.position_y,
          width: item.width,
          height: item.height,
          rotation: item.rotation,
          z_index: item.z_index,
          data: item.data,
          created_at: item.created_at,
          updated_at: item.updated_at,
          deleted_at: item.deleted_at ?? null,
          image_version_id: item.image_version_id ?? null,
          root_image_id: item.root_image_id ?? null,
        }));

      if (itemsToSync.length > 0) {
        // Use fetch with keepalive (more reliable than sendBeacon for POST+JSON)
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/canvas_items`;
        const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
        try {
          fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': apiKey,
              'Authorization': `Bearer ${accessTokenRef.current ?? ''}`,
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify(itemsToSync),
            keepalive: true,
          });
        } catch {
          // Best-effort — can't block unload
        }
      }

      // Persist current canvas id
      try {
        localStorage.setItem(LAST_CANVAS_KEY, state.currentCanvasId!);
      } catch { /* ignore */ }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [userId]);

  // ---------- flush sync for a specific canvas ----------
  const flushSync = useCallback(async (canvasId?: string) => {
    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
      syncTimer.current = null;
    }

    const state = useCanvasStore.getState();
    if (!state.isDirty) return;

    try {
      await syncMutation.mutateAsync(canvasId);
    } catch (err) {
      debugError('canvasSync', { action: 'flush_error', error: String(err) });
    }
  }, [syncMutation]);

  // ---------- load projects + canvases (idempotent, StrictMode safe) ----------
  const loadProjects = useCallback(async () => {
    if (!userId) return;
    // StrictMode guard - use global ref so all hook instances share state
    if (didInitGlobal.current) return;
    didInitGlobal.current = true;

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

        try { localStorage.setItem(LAST_CANVAS_KEY, newCanvas.id); } catch { /* ignore */ }
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

        let activeCanvases = canvases ?? [];

        if (activeCanvases.length === 0) {
          // Create default canvas only if truly zero
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
          activeCanvases = [newCanvas];
        }

        // Restore last-used canvas if still exists, else first
        let restoredCanvasId: string | null = null;
        try {
          restoredCanvasId = localStorage.getItem(LAST_CANVAS_KEY);
        } catch { /* ignore */ }

        const activeCanvas = activeCanvases.find(c => c.id === restoredCanvasId) ?? activeCanvases[0];

        // Load items for active canvas
        const { data: items, error: itemsError } = await supabase
          .from('canvas_items')
          .select('*')
          .eq('canvas_id', activeCanvas!.id)
          .is('deleted_at', null);

        if (itemsError) throw itemsError;

        debugLog('canvasSync', {
          action: 'loadProjects',
          projectId: currentProject.id,
          canvasCount: activeCanvases.length,
          activeCanvasId: activeCanvas!.id,
          itemCount: (items ?? []).length,
        });

        useCanvasStore.hydrate({
          projects: projects as Project[],
          canvases: activeCanvases as Canvas[],
          items: (items || []) as CanvasItem[],
          currentProjectId: currentProject.id,
          currentCanvasId: activeCanvas!.id,
        });

        // Restore viewport
        if (activeCanvas) {
          useCanvasStore.setZoom(activeCanvas.zoom_level || 1);
          useCanvasStore.setPan(activeCanvas.pan_x || 0, activeCanvas.pan_y || 0);
        }

        try { localStorage.setItem(LAST_CANVAS_KEY, activeCanvas!.id); } catch { /* ignore */ }
      }
    } catch (error) {
      console.error('[Canvas Sync] Load error:', error);
      debugError('canvasSync', { action: 'loadProjects_error', error: String(error) });
      useCanvasStore.setError('Failed to load canvas data');
      didInitGlobal.current = false; // Allow retry
    } finally {
      useCanvasStore.setLoading(false);
    }
  }, [userId]);

  // ---------- load items for a specific canvas ----------
  const loadCanvasItems = useCallback(async (canvasId: string) => {
    if (!userId) return;

    const state = useCanvasStore.getState();
    const previousCanvasId = state.currentCanvasId;

    debugLog('canvasSync', {
      action: 'switchCanvas',
      previousId: previousCanvasId,
      nextId: canvasId,
    });

    // Flush pending sync for previous canvas BEFORE switching
    if (previousCanvasId && previousCanvasId !== canvasId && state.isDirty) {
      await flushSync(previousCanvasId);
    }

    const { data: items, error } = await supabase
      .from('canvas_items')
      .select('*')
      .eq('canvas_id', canvasId)
      .is('deleted_at', null);

    if (error) {
      console.error('[Canvas Sync] Load items error:', error);
      debugError('canvasSync', { action: 'loadItems_error', canvasId, error: error.message });
      return;
    }

    debugLog('canvasSync', {
      action: 'loadCanvasItems',
      canvasId,
      loadedCount: (items ?? []).length,
    });

    const state = useCanvasStore.getState();
    const localItems = state.items.filter(i => i.canvas_id === canvasId);
    const mergedItems = mergeItemsByTimestamp(localItems, (items || []) as CanvasItem[]);

    useCanvasStore.setItemsForCanvas(canvasId, mergedItems);

    // Restore viewport for this canvas
    const canvas = state.canvases.find(c => c.id === canvasId);
    if (canvas) {
      useCanvasStore.setZoom(canvas.zoom_level || 1);
      useCanvasStore.setPan(canvas.pan_x || 0, canvas.pan_y || 0);
    }

    // Persist last canvas
    try { localStorage.setItem(LAST_CANVAS_KEY, canvasId); } catch { /* ignore */ }
  }, [userId, flushSync]);

  // ---------- create canvas ----------
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
    useCanvasStore.clearSelection();

    try { localStorage.setItem(LAST_CANVAS_KEY, newCanvas.id); } catch { /* ignore */ }
    return newCanvas;
  }, [userId]);

  // ---------- force sync (public API) ----------
  const forceSync = useCallback(async () => {
    await flushSync();
  }, [flushSync]);

  return {
    loadProjects,
    loadCanvasItems,
    createCanvas,
    forceSync,
    isSyncing: syncMutation.isPending,
  };
};
