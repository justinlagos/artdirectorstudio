import React from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { CanvasItemComponent } from './CanvasItem';

interface CanvasItemsProps {
  zoom: number;
}

export const CanvasItems = React.memo(({ zoom }: CanvasItemsProps) => {
  const items = useCanvasStore((s) => s.items);
  const selectedItemIds = useCanvasStore((s) => s.selectedItemIds);

  const visibleItems = items.filter((item) => !item.deleted_at);

  return (
    <>
      {visibleItems.map((item) => (
        <CanvasItemComponent
          key={item.id}
          item={item}
          isSelected={selectedItemIds.has(item.id)}
          zoom={zoom}
        />
      ))}
    </>
  );
});

CanvasItems.displayName = 'CanvasItems';
