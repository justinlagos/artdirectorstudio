import React, { useRef, useEffect, useCallback } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useCanvasViewport } from '@/hooks/canvas/useCanvasViewport';
import { useCanvasSelection } from '@/hooks/canvas/useCanvasSelection';
import { useCanvasDropZone } from '@/hooks/canvas/useCanvasDropZone';
import { CanvasGrid } from './CanvasGrid';
import { CanvasItems } from './CanvasItems';
import { SelectionBox } from './SelectionBox';
import { EmptyState } from './EmptyState';

export const CanvasViewport = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const panMode = useWorkspaceStore((s) => s.panMode);
  const zoom = useCanvasStore((s) => s.zoom);
  const panX = useCanvasStore((s) => s.panX);
  const panY = useCanvasStore((s) => s.panY);
  const items = useCanvasStore((s) => s.items);
  const currentCanvasId = useCanvasStore((s) => s.currentCanvasId);
  const showGrid = useWorkspaceStore((s) => s.showGrid);
  const hasItems = items.filter((i) => !i.deleted_at && i.canvas_id === currentCanvasId).length > 0;

  const {
    handleWheel,
    handlePanStart,
    handlePanStartFromPoint,
    handlePanMove,
    handlePanEnd,
    screenToCanvas,
  } = useCanvasViewport();
  const { selectionBox, handleSelectionStart, handleSelectionMove, handleSelectionEnd } =
    useCanvasSelection();
  const { isDragOver, handleDragOver, handleDragLeave, handleDrop } =
    useCanvasDropZone();

  // Attach wheel listener (needs passive: false)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const wheelHandler = (e: Event) => handleWheel(e as WheelEvent);
    el.addEventListener('wheel', wheelHandler, { passive: false });
    return () =>
      el.removeEventListener('wheel', wheelHandler);
  }, [handleWheel]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Pan: middle click, alt+click, or panMode + left click (container receives mousedown = background, items stopPropagation)
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        handlePanStart(e);
        return;
      }
      if (panMode && e.button === 0) {
        handlePanStartFromPoint(e.clientX, e.clientY);
        e.preventDefault();
        return;
      }

      // Selection: left click on background
      if (e.button === 0 && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const canvasPos = screenToCanvas(e.clientX, e.clientY, rect);
        handleSelectionStart(e, canvasPos.x, canvasPos.y);
      }
    },
    [
      panMode,
      handlePanStart,
      handlePanStartFromPoint,
      handleSelectionStart,
      screenToCanvas,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      handlePanMove(e);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const canvasPos = screenToCanvas(e.clientX, e.clientY, rect);
        handleSelectionMove(canvasPos.x, canvasPos.y);
      }
    },
    [handlePanMove, handleSelectionMove, screenToCanvas]
  );

  const handleMouseUp = useCallback(() => {
    handlePanEnd();
    handleSelectionEnd();
  }, [handlePanEnd, handleSelectionEnd]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (!containerRef.current) return;
      handleDrop(e, containerRef.current.getBoundingClientRect(), screenToCanvas);
    },
    [handleDrop, screenToCanvas]
  );

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      // If clicking directly on viewport background, clear selection
      if (
        e.target === e.currentTarget ||
        (e.target as HTMLElement).dataset.canvasBackground
      ) {
        useCanvasStore.clearSelection();
      }
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className={`
        relative w-full h-full overflow-hidden cursor-default select-none
        bg-neutral-950
        ${isDragOver ? 'ring-2 ring-inset ring-white/20' : ''}
      `}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleBackgroundClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={onDrop}
    >
      {/* Grid background */}
      {showGrid && <CanvasGrid zoom={zoom} />}

      {/* Transformed canvas layer */}
      <div
        data-canvas-background="true"
        className="absolute origin-top-left"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          willChange: 'transform',
        }}
      >
        <CanvasItems zoom={zoom} />
        <SelectionBox bounds={selectionBox} />
      </div>

      {/* Empty state */}
      {!hasItems && <EmptyState isDragOver={isDragOver} />}
    </div>
  );
};
