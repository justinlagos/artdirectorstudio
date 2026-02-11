import React from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { CanvasTabBar } from './CanvasTabBar';
import { ViewportControls } from './ViewportControls';
import { ArrowLeft, Undo2, Redo2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CanvasToolbarProps {
  onCreateCanvas: () => void;
  onSwitchCanvas: (canvasId: string) => void;
  onZoomToFit: () => void;
}

export const CanvasToolbar = ({ onCreateCanvas, onSwitchCanvas, onZoomToFit }: CanvasToolbarProps) => {
  const navigate = useNavigate();
  const projects = useCanvasStore(s => s.projects);
  const currentProjectId = useCanvasStore(s => s.currentProjectId);
  const undoStack = useCanvasStore(s => s.undoStack);
  const redoStack = useCanvasStore(s => s.redoStack);

  const currentProject = projects.find(p => p.id === currentProjectId);

  return (
    <div className="flex items-center justify-between h-10 px-3 bg-neutral-950 border-b border-white/5">
      {/* Left: Back + project name */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={() => navigate('/')}
          className="p-1 text-white/30 hover:text-white/60 rounded transition-colors"
          title="Back to home"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-white/50 font-medium truncate max-w-[150px]">
          {currentProject?.name || 'Untitled'}
        </span>
        <div className="w-px h-4 bg-white/10 mx-1" />
      </div>

      {/* Center: Canvas tabs */}
      <div className="flex-1 flex items-center justify-center min-w-0 mx-4">
        <CanvasTabBar onCreateCanvas={onCreateCanvas} onSwitchCanvas={onSwitchCanvas} />
      </div>

      {/* Right: Undo/redo + viewport controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => useCanvasStore.undo()}
            disabled={undoStack.length === 0}
            className="p-1 text-white/40 hover:text-white/70 disabled:text-white/15 rounded transition-colors"
            title="Undo (⌘Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => useCanvasStore.redo()}
            disabled={redoStack.length === 0}
            className="p-1 text-white/40 hover:text-white/70 disabled:text-white/15 rounded transition-colors"
            title="Redo (⌘⇧Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <ViewportControls onZoomToFit={onZoomToFit} />
      </div>
    </div>
  );
};
