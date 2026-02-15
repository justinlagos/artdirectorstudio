import React from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useCanvasStore } from '@/store/canvasStore';
import { Hand } from 'lucide-react';
import { mc } from '@/lib/microcopy';

export const MobilePanToggle: React.FC = () => {
  const selectedItemIds = useCanvasStore((s) => s.selectedItemIds);
  const hasSelection = selectedItemIds.size > 0;
  const panMode = useWorkspaceStore((s) => s.panMode);
  const setPanMode = useWorkspaceStore((s) => s.setPanMode);

  if (hasSelection) return null;

  const togglePan = () => setPanMode(!panMode);

  return (
    <button
      onClick={togglePan}
      className="absolute bottom-16 left-4 z-20 flex items-center justify-center w-10 h-10 rounded-[var(--sw-radius-pill)] bg-neutral-900/90 border border-white/10 shadow-[var(--sw-shadow-float)] text-white/70 hover:text-white/90 transition-colors"
      title={mc.tooltips.panHint}
    >
      <Hand className="w-5 h-5" />
    </button>
  );
};
