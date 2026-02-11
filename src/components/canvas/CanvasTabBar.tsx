import React from 'react';
import { Plus, X } from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';

interface CanvasTabBarProps {
  onCreateCanvas: () => void;
  onSwitchCanvas: (canvasId: string) => void;
}

export const CanvasTabBar = ({ onCreateCanvas, onSwitchCanvas }: CanvasTabBarProps) => {
  const canvases = useCanvasStore(s => s.canvases);
  const currentCanvasId = useCanvasStore(s => s.currentCanvasId);

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
      {canvases.filter(c => !c.deleted_at).map((canvas) => (
        <button
          key={canvas.id}
          onClick={() => onSwitchCanvas(canvas.id)}
          className={`
            flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-t-md
            transition-colors duration-150 whitespace-nowrap min-w-0
            ${canvas.id === currentCanvasId
              ? 'bg-neutral-900 text-white/90 border-t border-x border-white/10'
              : 'text-white/40 hover:text-white/60 hover:bg-neutral-900/50'}
          `}
        >
          <span className="truncate max-w-[120px]">{canvas.name}</span>
          {canvases.length > 1 && canvas.id === currentCanvasId && (
            <X
              className="w-3 h-3 text-white/30 hover:text-white/60 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                // Don't delete the last canvas
                if (canvases.filter(c => !c.deleted_at).length > 1) {
                  useCanvasStore.removeCanvas(canvas.id);
                }
              }}
            />
          )}
        </button>
      ))}
      <button
        onClick={onCreateCanvas}
        className="p-1.5 text-white/30 hover:text-white/60 hover:bg-neutral-900/50 rounded transition-colors"
        title="New canvas"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
