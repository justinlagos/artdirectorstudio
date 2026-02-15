import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Grid3x3 } from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { mc } from '@/lib/microcopy';

interface ViewportControlsProps {
  onZoomToFit: () => void;
}

export const ViewportControls = ({ onZoomToFit }: ViewportControlsProps) => {
  const zoom = useCanvasStore(s => s.zoom);
  const showGrid = useWorkspaceStore((s) => s.showGrid);
  const toggleShowGrid = useWorkspaceStore((s) => s.toggleShowGrid);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => useCanvasStore.setZoom(Math.max(0.1, zoom / 1.2))}
        className="p-1 text-white/40 hover:text-white/70 rounded transition-colors"
        title="Zoom out"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>
      <span className="text-[11px] text-white/40 min-w-[40px] text-center tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={() => useCanvasStore.setZoom(Math.min(5, zoom * 1.2))}
        className="p-1 text-white/40 hover:text-white/70 rounded transition-colors"
        title="Zoom in"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onZoomToFit}
        className="p-1 text-white/40 hover:text-white/70 rounded transition-colors ml-1"
        title="Fit to view"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={toggleShowGrid}
        className={`p-1 rounded transition-colors ml-1 ${
          showGrid
            ? 'text-[var(--sw-accent)] bg-[var(--sw-accent-dim)]'
            : 'text-white/40 hover:text-white/70'
        }`}
        title={showGrid ? mc.grid.hide : mc.grid.show}
      >
        <Grid3x3 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
