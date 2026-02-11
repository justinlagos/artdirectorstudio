import React, { useCallback, useRef } from 'react';
import type { CanvasItem as CanvasItemType } from '@/types/canvas';
import { useCanvasStore } from '@/store/canvasStore';
import { ImageItem } from './items/ImageItem';
import { NoteItem } from './items/NoteItem';
import { ReferenceItem } from './items/ReferenceItem';
import { ComparisonItem } from './items/ComparisonItem';

interface CanvasItemProps {
  item: CanvasItemType;
  isSelected: boolean;
  zoom: number;
}

const itemComponents: Record<string, React.FC<{ item: CanvasItemType }>> = {
  image: ImageItem,
  note: NoteItem,
  reference: ReferenceItem,
  comparison: ComparisonItem,
};

export const CanvasItemComponent = React.memo(
  ({ item, isSelected, zoom }: CanvasItemProps) => {
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const itemStart = useRef({ x: 0, y: 0 });
    const hasMoved = useRef(false);
    const resizeRef = useRef<string | null>(null);
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.stopPropagation();

        // Select item
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
        if (!hasMoved.current) {
          useCanvasStore.selectItem(item.id, e.shiftKey);
        }
      },
      [item.id]
    );

    const ItemComponent = itemComponents[item.type];
    if (!ItemComponent) return null;

    return (
      <div
        className="absolute group"
        style={{
          left: item.position_x,
          top: item.position_y,
          width: item.width,
          height: item.height,
          transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
          zIndex: item.z_index,
          cursor: isDragging.current ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        {/* Content */}
        <div
          className={`w-full h-full rounded-lg overflow-hidden transition-shadow duration-150 ${
            isSelected
              ? 'ring-2 ring-blue-500/70 shadow-lg shadow-blue-500/10'
              : 'hover:ring-1 hover:ring-white/20'
          }`}
        >
          <ItemComponent item={item} />
        </div>

        {/* Resize handles (only when selected) */}
        {isSelected && (
          <>
            {['nw', 'ne', 'sw', 'se'].map((corner) => (
              <div
                key={corner}
                className={`absolute w-3 h-3 bg-blue-500 border border-white/50 rounded-sm cursor-${
                  corner === 'nw' || corner === 'se' ? 'nwse' : 'nesw'
                }-resize z-10`}
                style={{
                  top: corner.includes('n') ? -6 : undefined,
                  bottom: corner.includes('s') ? -6 : undefined,
                  left: corner.includes('w') ? -6 : undefined,
                  right: corner.includes('e') ? -6 : undefined,
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
