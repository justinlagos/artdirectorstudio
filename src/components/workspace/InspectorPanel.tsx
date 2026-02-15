import React, { useState, useRef as useRefHook } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useCanvasStore } from '@/store/canvasStore';
import { DrawerContent } from './inspector/DrawerContent';
import { X, ImageOff } from 'lucide-react';
import type { ImageItemData, ReferenceItemData } from '@/types/canvas';

const TOOL_LABELS: Record<string, string> = {
  import: 'Import',
  analyze: 'Analyze',
  regenerate: 'Regenerate',
  effects: 'Effects',
  funlab: 'Fun Lab',
};

export const InspectorPanel: React.FC = () => {
  const activeTool = useWorkspaceStore((s) => s.activeTool);
  const closeInspector = useWorkspaceStore((s) => s.closeInspector);
  const selectedItemIds = useCanvasStore((s) => s.selectedItemIds);
  const items = useCanvasStore((s) => s.items);
  const [thumbError, setThumbError] = useState(false);

  const selectedId = [...selectedItemIds][0];
  const selectedItem = selectedId
    ? items.find((i) => i.id === selectedId && !i.deleted_at)
    : null;

  const showContent =
    activeTool !== null || selectedItem !== null || selectedItemIds.size === 0;

  const headerLabel = activeTool
    ? TOOL_LABELS[activeTool] ?? activeTool
    : selectedItem
      ? selectedItem.type === 'image'
        ? 'Working Image'
        : 'Reference'
      : null;

  // Resolve thumbnail URL from selected item
  const thumbnailSrc = (() => {
    if (!selectedItem) return null;
    if (selectedItem.type === 'image') {
      const data = selectedItem.data as ImageItemData;
      return data?.thumbnailUrl || data?.url || null;
    }
    if (selectedItem.type === 'reference') {
      const data = selectedItem.data as ReferenceItemData;
      return data?.thumbnailUrl || data?.url || null;
    }
    return null;
  })();

  // Reset error state when selection changes
  const prevIdRef = useRefHook(selectedId);
  if (prevIdRef.current !== selectedId) {
    prevIdRef.current = selectedId;
    if (thumbError) setThumbError(false);
  }

  return (
    <div
      className={`flex flex-col h-full bg-neutral-950 border-l border-white/5 transition-transform duration-200 ease-out ${
        showContent ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width: 'var(--sw-inspector-width)' }}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 shrink-0 ${
          activeTool
            ? 'border-b-2 border-[var(--sw-accent)]'
            : 'border-b border-white/5'
        }`}
      >
        {/* Thumbnail in header when item is selected */}
        {selectedItem && thumbnailSrc && !thumbError && (
          <div className="w-8 h-8 rounded-md overflow-hidden bg-neutral-800 shrink-0">
            <img
              src={thumbnailSrc}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setThumbError(true)}
            />
          </div>
        )}
        {selectedItem && (!thumbnailSrc || thumbError) && (
          <div className="w-8 h-8 rounded-md bg-neutral-800 shrink-0 flex items-center justify-center">
            <ImageOff className="w-4 h-4 text-white/20" />
          </div>
        )}
        <h2 className="text-sm font-medium text-white/90 flex-1 min-w-0 truncate">
          {headerLabel ?? 'Inspector'}
        </h2>
        <button
          onClick={closeInspector}
          className="p-1 text-white/40 hover:text-white/70 rounded transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <DrawerContent activeTool={activeTool} />
    </div>
  );
};
