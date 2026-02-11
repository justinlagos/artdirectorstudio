import { useEffect } from 'react';
import { useCanvasStore } from '@/store/canvasStore';

export const useCanvasKeyboard = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;

      // Don't capture when typing in input/textarea
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Undo: Cmd+Z
      if (isCmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useCanvasStore.undo();
        return;
      }

      // Redo: Cmd+Shift+Z or Cmd+Y
      if ((isCmd && e.key === 'z' && e.shiftKey) || (isCmd && e.key === 'y')) {
        e.preventDefault();
        useCanvasStore.redo();
        return;
      }

      // Delete selected items
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        useCanvasStore.deleteSelectedItems();
        return;
      }

      // Duplicate: Cmd+D
      if (isCmd && e.key === 'd') {
        e.preventDefault();
        useCanvasStore.duplicateSelectedItems();
        return;
      }

      // Select all: Cmd+A
      if (isCmd && e.key === 'a') {
        e.preventDefault();
        useCanvasStore.selectAll();
        return;
      }

      // Deselect: Escape
      if (e.key === 'Escape') {
        useCanvasStore.clearSelection();
        return;
      }

      // Zoom shortcuts
      if (isCmd && e.key === '=') {
        e.preventDefault();
        const state = useCanvasStore.getState();
        useCanvasStore.setZoom(Math.min(5, state.zoom * 1.2));
        return;
      }

      if (isCmd && e.key === '-') {
        e.preventDefault();
        const state = useCanvasStore.getState();
        useCanvasStore.setZoom(Math.max(0.1, state.zoom / 1.2));
        return;
      }

      // Reset zoom: Cmd+0
      if (isCmd && e.key === '0') {
        e.preventDefault();
        useCanvasStore.setZoom(1);
        useCanvasStore.setPan(0, 0);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
