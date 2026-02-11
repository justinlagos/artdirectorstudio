import React from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { Check, Loader2, AlertCircle } from 'lucide-react';

export const CanvasStatusBar = () => {
  const items = useCanvasStore(s => s.items);
  const zoom = useCanvasStore(s => s.zoom);
  const isSyncing = useCanvasStore(s => s.isSyncing);
  const isDirty = useCanvasStore(s => s.isDirty);
  const lastSyncedAt = useCanvasStore(s => s.lastSyncedAt);
  const error = useCanvasStore(s => s.error);

  const activeItems = items.filter(i => !i.deleted_at).length;

  const getSyncStatus = () => {
    if (error) return { icon: <AlertCircle className="w-3 h-3 text-red-400/70" />, text: 'Error' };
    if (isSyncing) return { icon: <Loader2 className="w-3 h-3 text-white/30 animate-spin" />, text: 'Saving...' };
    if (isDirty) return { icon: <Loader2 className="w-3 h-3 text-white/20" />, text: 'Unsaved' };
    return { icon: <Check className="w-3 h-3 text-green-500/50" />, text: 'Saved' };
  };

  const syncStatus = getSyncStatus();

  return (
    <div className="flex items-center justify-between h-6 px-3 bg-neutral-950 border-t border-white/5 text-[10px] text-white/30">
      <div className="flex items-center gap-3">
        <span>{activeItems} item{activeItems !== 1 ? 's' : ''}</span>
        <span className="tabular-nums">{Math.round(zoom * 100)}%</span>
      </div>
      <div className="flex items-center gap-1.5">
        {syncStatus.icon}
        <span>{syncStatus.text}</span>
      </div>
    </div>
  );
};
