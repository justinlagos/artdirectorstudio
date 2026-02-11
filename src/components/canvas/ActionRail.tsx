import React from 'react';
import { Trash2, Copy, StickyNote } from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';
import type { NoteItemData } from '@/types/canvas';

export const ActionRail = () => {
  const selectedItemIds = useCanvasStore(s => s.selectedItemIds);
  const items = useCanvasStore(s => s.items);
  const currentCanvasId = useCanvasStore(s => s.currentCanvasId);
  const selectedCount = selectedItemIds.size;

  const handleAddNote = () => {
    const state = useCanvasStore.getState();
    if (!currentCanvasId) return;

    const noteData: NoteItemData = { text: '', color: 'bg-amber-900/30' };
    useCanvasStore.addItem({
      id: crypto.randomUUID(),
      canvas_id: currentCanvasId,
      user_id: '', // Set by sync
      type: 'note',
      position_x: (-state.panX + 400) / state.zoom,
      position_y: (-state.panY + 300) / state.zoom,
      width: 200,
      height: 150,
      rotation: 0,
      z_index: items.length + 1,
      data: noteData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20">
      <div className="bg-neutral-950/90 backdrop-blur-sm border-l border-y border-white/5 rounded-l-lg p-1.5 flex flex-col gap-1">
        {/* Context label */}
        {selectedCount > 0 && (
          <div className="px-2 py-1 mb-1">
            <span className="text-[10px] text-white/40">
              {selectedCount} selected
            </span>
          </div>
        )}

        {/* Actions */}
        <button
          onClick={handleAddNote}
          className="p-2 text-white/40 hover:text-white/70 hover:bg-white/5 rounded transition-colors"
          title="Add note"
        >
          <StickyNote className="w-4 h-4" />
        </button>

        <button
          onClick={() => useCanvasStore.duplicateSelectedItems()}
          disabled={selectedCount === 0}
          className="p-2 text-white/40 hover:text-white/70 hover:bg-white/5 disabled:text-white/15 rounded transition-colors"
          title="Duplicate (⌘D)"
        >
          <Copy className="w-4 h-4" />
        </button>

        <button
          onClick={() => useCanvasStore.deleteSelectedItems()}
          disabled={selectedCount === 0}
          className="p-2 text-white/40 hover:text-red-400/70 hover:bg-red-500/5 disabled:text-white/15 rounded transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
