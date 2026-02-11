import React from 'react';
import type { Bounds } from '@/types/canvas';

interface SelectionBoxProps {
  bounds: Bounds | null;
}

export const SelectionBox = React.memo(({ bounds }: SelectionBoxProps) => {
  if (!bounds || bounds.width < 5 || bounds.height < 5) return null;

  return (
    <div
      className="absolute border border-blue-500/50 bg-blue-500/10 pointer-events-none"
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
      }}
    />
  );
});

SelectionBox.displayName = 'SelectionBox';
