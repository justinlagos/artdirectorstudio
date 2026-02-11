import React from 'react';
import type { CanvasItem, ComparisonItemData } from '@/types/canvas';

interface ComparisonItemProps {
  item: CanvasItem;
}

export const ComparisonItem = React.memo(({ item }: ComparisonItemProps) => {
  const data = item.data as ComparisonItemData;

  return (
    <div className="w-full h-full flex gap-1 rounded-lg overflow-hidden bg-neutral-900">
      <div className="flex-1 relative">
        <img
          src={data.leftImageUrl}
          alt="Left"
          className="w-full h-full object-cover"
          draggable={false}
        />
        <span className="absolute top-1 left-1 text-[10px] text-white/40 bg-black/40 px-1 rounded">
          A
        </span>
      </div>
      <div className="flex-1 relative">
        <img
          src={data.rightImageUrl}
          alt="Right"
          className="w-full h-full object-cover"
          draggable={false}
        />
        <span className="absolute top-1 right-1 text-[10px] text-white/40 bg-black/40 px-1 rounded">
          B
        </span>
      </div>
      {data.label && (
        <div className="absolute bottom-0 left-0 right-0 text-center py-1 bg-black/40">
          <span className="text-[10px] text-white/50">{data.label}</span>
        </div>
      )}
    </div>
  );
});

ComparisonItem.displayName = 'ComparisonItem';
