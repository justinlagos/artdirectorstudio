import React from 'react';
import type { CanvasItem, ImageItemData } from '@/types/canvas';
import { Loader2 } from 'lucide-react';

interface ImageItemProps {
  item: CanvasItem;
  filterStyle?: string;
}

export const ImageItem = React.memo(({ item, filterStyle }: ImageItemProps) => {
  const data = item.data as ImageItemData;

  return (
    <div className="w-full h-full relative overflow-hidden rounded-lg bg-neutral-900">
      <img
        src={data.url}
        alt={data.fileName || 'Canvas image'}
        className="w-full h-full object-cover"
        draggable={false}
        style={{
          filter: filterStyle || undefined,
          transition: 'filter 150ms ease-out',
        }}
      />
      {data.uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        </div>
      )}
    </div>
  );
});

ImageItem.displayName = 'ImageItem';
