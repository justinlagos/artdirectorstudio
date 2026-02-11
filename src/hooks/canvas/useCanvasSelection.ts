import { useCallback, useRef, useState } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import type { Bounds } from '@/types/canvas';

export const useCanvasSelection = () => {
  const [selectionBox, setSelectionBox] = useState<Bounds | null>(null);
  const selectionStart = useRef<{ x: number; y: number } | null>(null);
  const isSelecting = useRef(false);

  const handleSelectionStart = useCallback((e: React.MouseEvent, canvasX: number, canvasY: number) => {
    // Only on left click on canvas background (not on items)
    if (e.button !== 0) return;
    selectionStart.current = { x: canvasX, y: canvasY };
    isSelecting.current = true;
    if (!e.shiftKey) {
      useCanvasStore.clearSelection();
    }
  }, []);

  const handleSelectionMove = useCallback((canvasX: number, canvasY: number) => {
    if (!isSelecting.current || !selectionStart.current) return;
    const start = selectionStart.current;
    const box: Bounds = {
      x: Math.min(start.x, canvasX),
      y: Math.min(start.y, canvasY),
      width: Math.abs(canvasX - start.x),
      height: Math.abs(canvasY - start.y),
    };
    setSelectionBox(box);
  }, []);

  const handleSelectionEnd = useCallback(() => {
    if (selectionBox) {
      // Find items within selection box
      const state = useCanvasStore.getState();
      state.items.forEach(item => {
        if (item.deleted_at) return;
        const itemRight = item.position_x + item.width;
        const itemBottom = item.position_y + item.height;
        const boxRight = selectionBox.x + selectionBox.width;
        const boxBottom = selectionBox.y + selectionBox.height;

        // Check overlap
        if (item.position_x < boxRight && itemRight > selectionBox.x &&
            item.position_y < boxBottom && itemBottom > selectionBox.y) {
          useCanvasStore.selectItem(item.id, true);
        }
      });
    }
    isSelecting.current = false;
    selectionStart.current = null;
    setSelectionBox(null);
  }, [selectionBox]);

  return {
    selectionBox,
    isSelecting: isSelecting.current,
    handleSelectionStart,
    handleSelectionMove,
    handleSelectionEnd,
  };
};
