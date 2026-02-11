import React from 'react';

interface CanvasGridProps {
  zoom: number;
}

export const CanvasGrid = React.memo(({ zoom }: CanvasGridProps) => {
  const dotSize = 1;
  const spacing = 20;
  const opacity = Math.min(0.3, zoom * 0.2);

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle, rgba(255,255,255,${opacity}) ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${spacing * zoom}px ${spacing * zoom}px`,
      }}
    />
  );
});

CanvasGrid.displayName = 'CanvasGrid';
