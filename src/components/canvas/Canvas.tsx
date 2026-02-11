import React, { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCanvasSync } from '@/hooks/canvas/useCanvasSync';
import { useCanvasKeyboard } from '@/hooks/canvas/useCanvasKeyboard';
import { useCanvasViewport } from '@/hooks/canvas/useCanvasViewport';
import { CanvasToolbar } from './CanvasToolbar';
import { CanvasViewport } from './CanvasViewport';
import { ReferenceDock } from './ReferenceDock';
import { ActionRail } from './ActionRail';
import { CanvasStatusBar } from './CanvasStatusBar';

export const Canvas = () => {
  const { user } = useAuth();
  const { loadProjects, createCanvas, loadCanvasItems } = useCanvasSync(user?.id);
  const { zoomToFit } = useCanvasViewport();
  const viewportRef = useRef<HTMLDivElement>(null);

  // Init keyboard shortcuts
  useCanvasKeyboard();

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      loadProjects();
    }
  }, [user?.id, loadProjects]);

  const handleCreateCanvas = useCallback(async () => {
    const state = (await import('@/store/canvasStore')).useCanvasStore.getState();
    if (state.currentProjectId) {
      await createCanvas(state.currentProjectId);
    }
  }, [createCanvas]);

  const handleSwitchCanvas = useCallback(async (canvasId: string) => {
    await loadCanvasItems(canvasId);
  }, [loadCanvasItems]);

  const handleZoomToFit = useCallback(() => {
    if (viewportRef.current) {
      zoomToFit(viewportRef.current.getBoundingClientRect());
    }
  }, [zoomToFit]);

  return (
    <div className="flex flex-col h-screen bg-neutral-950">
      {/* Toolbar */}
      <CanvasToolbar
        onCreateCanvas={handleCreateCanvas}
        onSwitchCanvas={handleSwitchCanvas}
        onZoomToFit={handleZoomToFit}
      />

      {/* Main area */}
      <div className="flex-1 relative overflow-hidden" ref={viewportRef}>
        <ReferenceDock />
        <CanvasViewport />
        <ActionRail />
      </div>

      {/* Status bar */}
      <CanvasStatusBar />
    </div>
  );
};
