import React, { useState, useRef, useEffect } from 'react';
import type { CanvasItem, NoteItemData } from '@/types/canvas';
import { useCanvasStore } from '@/store/canvasStore';

interface NoteItemProps {
  item: CanvasItem;
}

export const NoteItem = React.memo(({ item }: NoteItemProps) => {
  const data = item.data as NoteItemData;
  const [isEditing, setIsEditing] = useState(!data.text);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (textRef.current) {
      useCanvasStore.updateItem(item.id, {
        data: { ...data, text: textRef.current.value },
      });
    }
  };

  const bgColor = data.color || 'bg-amber-900/30';

  return (
    <div className={`w-full h-full p-3 rounded-lg ${bgColor} border border-white/10`}>
      {isEditing ? (
        <textarea
          ref={textRef}
          defaultValue={data.text}
          onBlur={handleBlur}
          className="w-full h-full bg-transparent text-white/80 text-sm resize-none outline-none placeholder:text-white/30"
          placeholder="Write a note..."
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          className="w-full h-full text-white/80 text-sm cursor-text overflow-hidden"
          onDoubleClick={() => setIsEditing(true)}
        >
          {data.text || 'Double-click to edit...'}
        </div>
      )}
    </div>
  );
});

NoteItem.displayName = 'NoteItem';
