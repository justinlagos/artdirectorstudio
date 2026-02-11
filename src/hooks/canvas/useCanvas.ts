import { useCanvasStore } from '@/store/canvasStore';
import type { CanvasState } from '@/types/canvas';

export const useCanvas = <T,>(selector: (state: CanvasState) => T): T => {
  return useCanvasStore(selector);
};
