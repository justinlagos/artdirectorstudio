import React, { useState, useCallback } from 'react';

type SnapPoint = 'peek' | 'half' | 'full';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Primary action area - always visible in Peek */
  primaryAction?: React.ReactNode;
}

const PEEK_HEIGHT = 80;
const HALF_HEIGHT = '50dvh';
const FULL_HEIGHT = '90dvh';

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  children,
  primaryAction,
}) => {
  const [snap, setSnap] = useState<SnapPoint>('peek');
  const [dragY, setDragY] = useState(0);

  const handleDragEnd = useCallback(() => {
    setDragY(0);
  }, []);

  if (!open) return null;

  const heights: Record<SnapPoint, string> = {
    peek: `${PEEK_HEIGHT}px`,
    half: HALF_HEIGHT,
    full: FULL_HEIGHT,
  };

  const height = heights[snap];
  const showBackdrop = snap === 'half' || snap === 'full';

  return (
    <>
      {showBackdrop && (
        <div
          className="fixed inset-0 z-40 bg-black/8 transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[var(--sw-radius-panel)] bg-neutral-950 border-t border-white/10 shadow-[var(--sw-shadow-float)]"
        style={{
          height: `calc(${height} + ${dragY}px)`,
          maxHeight: '90dvh',
          transition: dragY === 0 ? 'height 200ms ease-out' : 'none',
        }}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center py-2 cursor-grab active:cursor-grabbing touch-manipulation"
          onTouchStart={() => {}}
        >
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Primary action - always visible in Peek */}
        {primaryAction && (
          <div className="px-4 pb-3 shrink-0">{primaryAction}</div>
        )}

        {/* Content - scrollable in Half/Full */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </>
  );
};
