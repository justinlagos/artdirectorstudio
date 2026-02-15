import React from 'react';
import { mc } from '@/lib/microcopy';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useCanvasStore } from '@/store/canvasStore';
import type { CanvasItem } from '@/types/canvas';
import type { ImageItemData } from '@/types/canvas';

interface InspectorItemContextProps {
  item: CanvasItem;
}

export const InspectorItemContext: React.FC<InspectorItemContextProps> = ({
  item,
}) => {
  const setActiveTool = useWorkspaceStore((s) => s.setActiveTool);
  const data = item.data as ImageItemData & { analysis_data?: unknown };
  const hasAnalysisData = !!(data && 'analysis_data' in data && data.analysis_data);
  const isImage = item.type === 'image';
  const showFirstImageNudge = isImage && !hasAnalysisData;

  const typeLabel =
    item.type === 'image'
      ? mc.inspector.itemContext.workingImage
      : mc.inspector.itemContext.reference;

  const handleDuplicate = () => {
    useCanvasStore.duplicateItem(item.id);
  };

  const handleDelete = () => {
    useCanvasStore.deleteItem(item.id);
  };

  const handleAnalyze = () => {
    setActiveTool('analyze');
  };

  if (item.type === 'reference') {
    return (
      <div className="p-4">
        <p className="text-xs text-white/60 mb-4">
          {mc.inspector.itemContext.cannotApplyToolsToReference}
        </p>
        <div className="text-xs text-white/40">
          <span className="font-medium text-white/60">{typeLabel}</span>
          <span className="ml-2">
            {item.width} × {item.height}
          </span>
          <span className="ml-2">
            @ {Math.round(item.position_x)}, {Math.round(item.position_y)}
          </span>
        </div>
      </div>
    );
  }

  const thumbnailUrl =
    (data as ImageItemData)?.thumbnailUrl || (data as ImageItemData)?.url;

  return (
    <div className="p-4 space-y-4">
      {showFirstImageNudge && (
        <div className="p-3 rounded-[var(--sw-radius-panel)] bg-[var(--sw-accent-dim)] border border-[var(--sw-accent)]/20">
          <p className="text-sm font-medium text-white/90 mb-1">
            {mc.workspace.firstImage.nudge.title}
          </p>
          <p className="text-xs text-white/60 mb-3">
            {mc.workspace.firstImage.nudge.body}
          </p>
          <button
            onClick={handleAnalyze}
            className="px-3 py-1.5 rounded-md bg-[var(--sw-accent)] text-white text-xs font-medium"
          >
            {mc.workspace.firstImage.nudge.button}
          </button>
        </div>
      )}

      {thumbnailUrl && (
        <div className="aspect-square max-h-32 rounded-[var(--sw-radius-panel)] overflow-hidden bg-neutral-900">
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="text-xs text-white/60">
        <span className="font-medium text-white/70">{typeLabel}</span>
        <span className="ml-2">
          {item.width} × {item.height}
        </span>
        <span className="ml-2">
          @ {Math.round(item.position_x)}, {Math.round(item.position_y)}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleDuplicate}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/5 hover:bg-white/10 text-white/80"
        >
          {mc.inspector.itemContext.duplicate}
        </button>
        <button
          onClick={handleDelete}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400/90"
        >
          {mc.inspector.itemContext.delete}
        </button>
        <button
          onClick={handleAnalyze}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--sw-accent-dim)] hover:bg-[var(--sw-accent)]/20 text-[var(--sw-accent)]"
        >
          {mc.inspector.itemContext.analyze}
        </button>
      </div>
    </div>
  );
};
