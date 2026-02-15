import { useCallback, useRef } from 'react';
import { useCanvasStore } from '@/store/canvasStore';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_SENSITIVITY = 0.001;

export const useCanvasViewport = () => {
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffset = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const state = useCanvasStore.getState();
    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoom * (1 + delta)));

    // Zoom centered on cursor
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomRatio = newZoom / state.zoom;
    const newPanX = mouseX - (mouseX - state.panX) * zoomRatio;
    const newPanY = mouseY - (mouseY - state.panY) * zoomRatio;

    useCanvasStore.setZoom(newZoom);
    useCanvasStore.setPan(newPanX, newPanY);
  }, []);

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    // Middle click or alt+click (or panMode on mobile)
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true;
      const state = useCanvasStore.getState();
      panStart.current = { x: e.clientX, y: e.clientY };
      panOffset.current = { x: state.panX, y: state.panY };
      e.preventDefault();
    }
  }, []);

  const handlePanStartFromPoint = useCallback((clientX: number, clientY: number) => {
    isPanning.current = true;
    const state = useCanvasStore.getState();
    panStart.current = { x: clientX, y: clientY };
    panOffset.current = { x: state.panX, y: state.panY };
  }, []);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    useCanvasStore.setPan(panOffset.current.x + dx, panOffset.current.y + dy);
  }, []);

  const handlePanEnd = useCallback(() => {
    isPanning.current = false;
  }, []);

  const screenToCanvas = useCallback((screenX: number, screenY: number, containerRect: DOMRect) => {
    const state = useCanvasStore.getState();
    return {
      x: (screenX - containerRect.left - state.panX) / state.zoom,
      y: (screenY - containerRect.top - state.panY) / state.zoom,
    };
  }, []);

  const canvasToScreen = useCallback((canvasX: number, canvasY: number, containerRect: DOMRect) => {
    const state = useCanvasStore.getState();
    return {
      x: canvasX * state.zoom + state.panX + containerRect.left,
      y: canvasY * state.zoom + state.panY + containerRect.top,
    };
  }, []);

  const zoomToFit = useCallback((containerRect: DOMRect) => {
    const state = useCanvasStore.getState();
    const items = state.items.filter(i => !i.deleted_at);
    if (items.length === 0) {
      useCanvasStore.setZoom(1);
      useCanvasStore.setPan(0, 0);
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach(item => {
      minX = Math.min(minX, item.position_x);
      minY = Math.min(minY, item.position_y);
      maxX = Math.max(maxX, item.position_x + item.width);
      maxY = Math.max(maxY, item.position_y + item.height);
    });

    const padding = 50;
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;
    const scaleX = containerRect.width / contentWidth;
    const scaleY = containerRect.height / contentHeight;
    const newZoom = Math.max(MIN_ZOOM, Math.min(1, Math.min(scaleX, scaleY)));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const newPanX = containerRect.width / 2 - centerX * newZoom;
    const newPanY = containerRect.height / 2 - centerY * newZoom;

    useCanvasStore.setZoom(newZoom);
    useCanvasStore.setPan(newPanX, newPanY);
  }, []);

  const handlePanMoveFromPoint = useCallback((clientX: number, clientY: number) => {
    if (!isPanning.current) return;
    const dx = clientX - panStart.current.x;
    const dy = clientY - panStart.current.y;
    useCanvasStore.setPan(panOffset.current.x + dx, panOffset.current.y + dy);
  }, []);

  return {
    isPanning: isPanning.current,
    handleWheel,
    handlePanStart,
    handlePanStartFromPoint,
    handlePanMove,
    handlePanMoveFromPoint,
    handlePanEnd,
    screenToCanvas,
    canvasToScreen,
    zoomToFit,
  };
};
