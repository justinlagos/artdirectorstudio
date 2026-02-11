import React from 'react';
import type { CanvasItem, ReferenceItemData } from '@/types/canvas';
import { Link } from 'lucide-react';

interface ReferenceItemProps {
  item: CanvasItem;
}

export const ReferenceItem = React.memo(({ item }: ReferenceItemProps) => {
  const data = item.data as ReferenceItemData;

  return (
    <div className="w-full h-full relative overflow-hidden rounded-lg bg-neutral-900 border border-blue-500/20">
      <img
        src={data.url || data.thumbnailUrl}
        alt={data.label || 'Reference'}
        className="w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center gap-1">
          <Link className="w-3 h-3 text-blue-400/70" />
          <span className="text-[10px] text-white/50 truncate">
            {data.label || 'Reference'}
          </span>
        </div>
      </div>
    </div>
  );
});

ReferenceItem.displayName = 'ReferenceItem';
