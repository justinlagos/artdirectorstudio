import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { CanvasItem as CanvasItemType } from '@/types/canvas';
import { useCanvasStore } from '@/store/canvasStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useEffectsPreview } from '@/hooks/useEffectsPreview';
import { ImageItem } from './items/ImageItem';
import { NoteItem } from './items/NoteItem';
import { ReferenceItem } from './items/ReferenceItem';
import { ComparisonItem } from './items/ComparisonItem';
import { mc } from '@/lib/microcopy';
import { Loader2 } from 'lucide-react';

interface CanvasItemProps {
  item: CanvasItemType;
  isSelected: boolean;
  selectedCount: number;
  zoom: number;
}

const itemComponents: Record<string, React.FC<{ item: CanvasItemType; filterStyle?: string }>> = {
  image: ImageItem,
  note: NoteItem as any,
  reference: ReferenceItem as any,
  comparison: ComparisonItem as any,
};

const ACTION_LABELS: Record<string, string> = {
  analyze: 'Analyzing…',
  regenerate: 'Regenerating…',
  effects: 'Applying…',
  funlab: 'Generating…',
};

export const CanvasItemComponent = React.memo(
  ({ item, isSelected, selectedCount, zoom }: CanvasItemProps) => {
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const itemStart = useRef({ x: 0, y: 0 });
    const hasMoved = useRef(false);
    const resizeRef = useRef<string | null>(null);
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
    const lastTapTime = useRef(0);
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [showHoverChip, setShowHoverChip] = useState(false);
    const [spaceHeld, setSpaceHeld] = useState(false);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Effects preview (only for selected image items when effects tool active)
    const activeTool = useWorkspaceStore((s) => s.activeTool);
    const { filterStyle } = useEffectsPreview();
    const jobs = useWorkspaceStore((s) => s.jobs);

    const dimmed = selectedCount > 0 && !isSelected;
    const typeLabel =
      item.type === 'image' || item.type === 'note'
        ? mc.inspector.itemContext.workingImage
        : mc.inspector.itemContext.reference;

    const setActiveTool = useWorkspaceStore((s) => s.setActiveTool);

    // Job status for this item
    const itemJob = jobs.find(
      (j) => j.item_id === item.id && (j.status === 'running' || j.status === 'pending')
    );

    // Before/After: hold Space (desktop) or two-finger press (mobile)
    // to show original (no filter) when effects tool is active
    const itemRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!isSelected || activeTool !== 'effects') return;

      // Desktop: Space key
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !e.repeat) {
          const active = document.activeElement;
          if (
            active instanceof HTMLInputElement ||
            active instanceof HTMLTextAreaElement ||
            active instanceof HTMLSelectElement
          ) {
            return;
          }
          e.preventDefault();
          setSpaceHeld(true);
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
          setSpaceHeld(false);
        }
      };

      // Mobile: two-finger touch
      const el = itemRef.current;
      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length >= 2) {
          setSpaceHeld(true);
        }
      };
      const handleTouchEnd = (e: TouchEvent) => {
        if (e.touches.length < 2) {
          setSpaceHeld(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      el?.addEventListener('touchstart', handleTouchStart, { passive: true });
      el?.addEventListener('touchend', handleTouchEnd, { passive: true });
      el?.addEventListener('touchcancel', handleTouchEnd, { passive: true });

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        el?.removeEventListener('touchstart', handleTouchStart);
        el?.removeEventListener('touchend', handleTouchEnd);
        el?.removeEventListener('touchcancel', handleTouchEnd);
      };
    }, [isSelected, activeTool]);

    // Compute effective filter for this item
    const effectiveFilter =
      isSelected && activeTool === 'effects' && item.type === 'image' && !spaceHeld
        ? filterStyle
        : undefined;

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.stopPropagation();

        if (!isSelected) {
          useCanvasStore.selectItem(item.id, e.shiftKey);
        }

        isDragging.current = true;
        hasMoved.current = false;
        dragStart.current = { x: e.clientX, y: e.clientY };
        itemStart.current = { x: item.position_x, y: item.position_y };

        const handleMouseMove = (moveE: MouseEvent) => {
          if (!isDragging.current) return;
          const dx = (moveE.clientX - dragStart.current.x) / zoom;
          const dy = (moveE.clientY - dragStart.current.y) / zoom;

          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            hasMoved.current = true;
          }

          if (hasMoved.current) {
            useCanvasStore.moveItem(
              item.id,
              itemStart.current.x + dx,
              itemStart.current.y + dy
            );
          }
        };

        const handleMouseUp = () => {
          isDragging.current = false;
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      },
      [item.id, item.position_x, item.position_y, isSelected, zoom]
    );

    const handleResizeStart = useCallback(
      (e: React.MouseEvent, corner: string) => {
        e.stopPropagation();
        e.preventDefault();
        resizeRef.current = corner;
        resizeStart.current = {
          x: e.clientX,
          y: e.clientY,
          w: item.width,
          h: item.height,
        };

        const handleMove = (moveE: MouseEvent) => {
          const dx = (moveE.clientX - resizeStart.current.x) / zoom;
          const dy = (moveE.clientY - resizeStart.current.y) / zoom;
          let newW = resizeStart.current.w;
          let newH = resizeStart.current.h;

          if (corner.includes('e'))
            newW = Math.max(50, resizeStart.current.w + dx);
          if (corner.includes('w'))
            newW = Math.max(50, resizeStart.current.w - dx);
          if (corner.includes('s'))
            newH = Math.max(50, resizeStart.current.h + dy);
          if (corner.includes('n'))
            newH = Math.max(50, resizeStart.current.h - dy);

          useCanvasStore.resizeItem(item.id, newW, newH);
        };

        const handleUp = () => {
          resizeRef.current = null;
          document.removeEventListener('mousemove', handleMove);
          document.removeEventListener('mouseup', handleUp);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
      },
      [item.id, item.width, item.height, zoom]
    );

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasMoved.current) return;

        if (!isSelected) {
          useCanvasStore.selectItem(item.id, e.shiftKey);
          return;
        }

        const now = Date.now();
        if (now - lastTapTime.current < 300) {
          setShowQuickActions((v) => !v);
          lastTapTime.current = 0;
        } else {
          lastTapTime.current = now;
        }
      },
      [item.id, isSelected]
    );

    const handleMouseEnter = useCallback(() => {
      if (isSelected) return;
      setIsHovering(true);
      hoverTimer.current = setTimeout(() => setShowHoverChip(true), 200);
    }, [isSelected]);

    const handleMouseLeave = useCallback(() => {
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
      setIsHovering(false);
      setShowHoverChip(false);
    }, []);

    const ItemComponent = itemComponents[item.type];
    if (!ItemComponent) return null;

    return (
      <div
        ref={itemRef}
        className="absolute group"
        style={{
          left: item.position_x,
          top: item.position_y,
          width: item.width,
          height: item.height,
          transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
          zIndex: item.z_index,
          cursor: isDragging.current ? 'grabbing' : 'grab',
          opacity: dimmed ? 'var(--sw-dim-opacity)' : 1,
          transition: 'opacity 200ms ease-out',
        }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Content with Swedish selection ring */}
        <div
          className="w-full h-full rounded-lg overflow-hidden transition-all duration-200 ease-out"
          style={{
            boxShadow: isSelected
              ? '0 0 0 2px var(--sw-selection-ring), 0 0 12px rgba(91,127,255,0.15)'
              : isHovering
                ? '0 0 0 1px rgba(91,127,255,0.4)'
                : undefined,
          }}
        >
          <ItemComponent item={item} filterStyle={effectiveFilter} />
        </div>

        {/* Job status pill */}
        {itemJob && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900/95 border border-white/10 shadow-lg">
            <Loader2 className="w-3 h-3 text-[var(--sw-accent)] animate-spin" />
            <span className="text-[10px] text-white/70 font-medium">
              {ACTION_LABELS[itemJob.action] ?? mc.loading.loading}
            </span>
          </div>
        )}

        {/* Hover chip - Working/Reference */}
        {showHoverChip && !isSelected && (
          <div
            className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-900/90 text-white/80 z-10"
            style={{ transition: 'opacity 200ms ease-out' }}
          >
            {typeLabel}
          </div>
        )}

        {/* Quick actions popover - double-tap on selected */}
        {showQuickActions && isSelected && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowQuickActions(false)}
              aria-hidden="true"
            />
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 flex gap-1 p-2 rounded-[var(--sw-radius-panel)] bg-neutral-900/95 border border-white/10 shadow-[var(--sw-shadow-float)]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  useCanvasStore.duplicateItem(item.id);
                  setShowQuickActions(false);
                }}
                className="px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 rounded transition-colors"
              >
                {mc.inspector.itemContext.duplicate}
              </button>
              <button
                onClick={() => {
                  setShowQuickActions(false);
                  useWorkspaceStore.getState().showConfirmDialog({
                    title: mc.confirmDialogs.deleteItem.title,
                    body: mc.confirmDialogs.deleteItem.body,
                    confirmLabel: mc.confirmDialogs.deleteItem.confirm,
                    cancelLabel: mc.confirmDialogs.deleteItem.cancel,
                    destructive: true,
                    onConfirm: () => useCanvasStore.deleteItem(item.id),
                  });
                }}
                className="px-3 py-1.5 text-xs font-medium text-red-400/90 hover:bg-red-500/10 rounded transition-colors"
              >
                {mc.inspector.itemContext.delete}
              </button>
              {item.type === 'image' && (
                <button
                  onClick={() => {
                    setActiveTool('analyze');
                    setShowQuickActions(false);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-[var(--sw-accent)] hover:bg-[var(--sw-accent-dim)] rounded transition-colors"
                >
                  {mc.inspector.itemContext.analyze}
                </button>
              )}
            </div>
          </>
        )}

        {/* Resize handles (only when selected) */}
        {isSelected && (
          <>
            {['nw', 'ne', 'sw', 'se'].map((corner) => (
              <div
                key={corner}
                className="absolute w-3 h-3 bg-[var(--sw-accent)] border border-white/50 rounded-sm z-10"
                style={{
                  top: corner.includes('n') ? -6 : undefined,
                  bottom: corner.includes('s') ? -6 : undefined,
                  left: corner.includes('w') ? -6 : undefined,
                  right: corner.includes('e') ? -6 : undefined,
                  cursor:
                    corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize',
                }}
                onMouseDown={(e) => handleResizeStart(e, corner)}
              />
            ))}
          </>
        )}
      </div>
    );
  }
);

CanvasItemComponent.displayName = 'CanvasItem';
