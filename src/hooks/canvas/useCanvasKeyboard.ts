import { useEffect } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { mc } from '@/lib/microcopy';

const isInputFocused = () => {
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLElement)) return false;
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.getAttribute('contenteditable') === 'true'
  );
};

export const useCanvasKeyboard = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;
      const inputFocused = isInputFocused();

      // Escape always works: close Inspector first, then deselect
      if (e.key === 'Escape') {
        const workspaceState = useWorkspaceStore.getState();
        if (workspaceState.activeTool !== null) {
          useWorkspaceStore.getState().closeInspector();
          e.preventDefault();
        } else {
          useCanvasStore.clearSelection();
        }
        return;
      }

      // Skip all other shortcuts when typing in input
      if (inputFocused) return;

      // Undo: Cmd+Z - let browser handle text undo when input focused
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

      // Delete selected items with confirm dialog
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const selectedIds = useCanvasStore.getState().selectedItemIds;
        if (selectedIds.size === 0) return;
        useWorkspaceStore.getState().showConfirmDialog({
          title: mc.confirmDialogs.deleteItem.title,
          body: mc.confirmDialogs.deleteItem.body,
          confirmLabel: mc.confirmDialogs.deleteItem.confirm,
          cancelLabel: mc.confirmDialogs.deleteItem.cancel,
          destructive: true,
          onConfirm: () => useCanvasStore.deleteSelectedItems(),
        });
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
