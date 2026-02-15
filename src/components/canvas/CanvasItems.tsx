import React, { useMemo, useState, useCallback } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { CanvasItemComponent } from './CanvasItem';
import { mc } from '@/lib/microcopy';
import type { CanvasItem } from '@/types/canvas';

interface CanvasItemsProps {
  zoom: number;
}

const PILE_OFFSET = 4;
const MAX_FAN = 8;

/**
 * Group items by root_image_id for smart stacking.
 * Items without root_image_id are treated as solo groups.
 */
function groupByRoot(items: CanvasItem[]): Map<string, CanvasItem[]> {
  const groups = new Map<string, CanvasItem[]>();
  for (const item of items) {
    const key = item.root_image_id ?? item.id;
    const existing = groups.get(key);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return groups;
}

interface PileProps {
  items: CanvasItem[];
  selectedItemIds: Set<string>;
  selectedCount: number;
  zoom: number;
}

const Pile = React.memo(({ items, selectedItemIds, selectedCount, zoom }: PileProps) => {
  const [expanded, setExpanded] = useState(false);

  const handlePileClick = useCallback((e: React.MouseEvent) => {
    // Only handle click on the pile overlay, not individual items
    e.stopPropagation();
    setExpanded(true);
  }, []);

  // Single item: render normally
  if (items.length === 1) {
    return (
      <CanvasItemComponent
        key={items[0].id}
        item={items[0]}
        isSelected={selectedItemIds.has(items[0].id)}
        selectedCount={selectedCount}
        zoom={zoom}
      />
    );
  }

  // Expanded: fan out radially
  if (expanded) {
    const visibleItems = items.slice(0, MAX_FAN);
    const overflowCount = items.length - MAX_FAN;

    return (
      <>
        {visibleItems.map((item, idx) => {
          // Fan radially from the base item position
          const angle = (idx / Math.max(visibleItems.length - 1, 1)) * Math.PI * 0.6 - Math.PI * 0.3;
          const radius = 60 + idx * 20;
          const fanItem = {
            ...item,
            position_x: items[0].position_x + Math.cos(angle) * radius,
            position_y: items[0].position_y + Math.sin(angle) * radius,
          };

          return (
            <CanvasItemComponent
              key={item.id}
              item={fanItem}
              isSelected={selectedItemIds.has(item.id)}
              selectedCount={selectedCount}
              zoom={zoom}
            />
          );
        })}

        {/* +N badge */}
        {overflowCount > 0 && (
          <div
            className="absolute z-50 flex items-center justify-center w-8 h-8 rounded-full bg-neutral-900/95 border border-white/20 cursor-pointer hover:bg-neutral-800"
            style={{
              left: items[0].position_x + items[0].width + 10,
              top: items[0].position_y,
            }}
            title={mc.tooltips.versionClick}
          >
            <span className="text-[10px] text-white/70 font-medium">+{overflowCount}</span>
          </div>
        )}

        {/* Collapse handle */}
        <div
          className="absolute z-50 flex items-center justify-center cursor-pointer"
          style={{
            left: items[0].position_x - 20,
            top: items[0].position_y - 20,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
        >
          <div className="px-2 py-0.5 rounded-full bg-neutral-900/90 border border-white/10 text-[9px] text-white/50 hover:bg-neutral-800">
            {mc.misc.collapse}
          </div>
        </div>
      </>
    );
  }

  // Collapsed pile: stack with offset
  const topItem = items[items.length - 1]; // Most recent on top
  const behindItems = items.slice(0, -1).slice(-3); // Show max 3 behind cards

  return (
    <>
      {/* Behind cards (visual only) */}
      {behindItems.map((item, idx) => (
        <div
          key={`pile-bg-${item.id}`}
          className="absolute rounded-lg bg-neutral-800/60 border border-white/5 pointer-events-none"
          style={{
            left: items[0].position_x + (behindItems.length - idx) * PILE_OFFSET,
            top: items[0].position_y + (behindItems.length - idx) * PILE_OFFSET,
            width: items[0].width,
            height: items[0].height,
            zIndex: items[0].z_index - behindItems.length + idx,
          }}
        />
      ))}

      {/* Top item (interactive) */}
      <CanvasItemComponent
        item={topItem}
        isSelected={selectedItemIds.has(topItem.id)}
        selectedCount={selectedCount}
        zoom={zoom}
      />

      {/* Pile count badge + click to expand */}
      {items.length > 1 && (
        <div
          className="absolute z-30 cursor-pointer"
          style={{
            left: items[0].position_x + items[0].width - 12,
            top: items[0].position_y - 8,
          }}
          onClick={handlePileClick}
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--sw-accent)] border-2 border-neutral-950 text-[10px] text-white font-bold shadow-lg hover:scale-110 transition-transform">
            {items.length}
          </div>
        </div>
      )}
    </>
  );
});

Pile.displayName = 'Pile';

export const CanvasItems = React.memo(({ zoom }: CanvasItemsProps) => {
  const items = useCanvasStore((s) => s.items);
  const currentCanvasId = useCanvasStore((s) => s.currentCanvasId);
  const selectedItemIds = useCanvasStore((s) => s.selectedItemIds);
  const selectedCount = selectedItemIds.size;

  const visibleItems = useMemo(
    () => items.filter((item) => !item.deleted_at && item.canvas_id === currentCanvasId),
    [items, currentCanvasId]
  );

  const groups = useMemo(() => groupByRoot(visibleItems), [visibleItems]);

  return (
    <>
      {Array.from(groups.entries()).map(([rootId, groupItems]) => (
        <Pile
          key={rootId}
          items={groupItems}
          selectedItemIds={selectedItemIds}
          selectedCount={selectedCount}
          zoom={zoom}
        />
      ))}
    </>
  );
});

CanvasItems.displayName = 'CanvasItems';
