import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { FunLabResult } from './ResultTiles';

interface DiscardableChipProps {
  results: FunLabResult[];
  anchorX: number;
  anchorY: number;
  onExpand: () => void;
  onDismiss: () => void;
}

/**
 * Small pill/chip: "Other options (N)" with expand click and dismiss ×.
 * Session-scoped: cleared on page reload.
 * Positioned on board at the location where tiles were.
 */
export const DiscardableChip: React.FC<DiscardableChipProps> = ({
  results,
  anchorX,
  anchorY,
  onExpand,
  onDismiss,
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || results.length === 0) return null;

  return (
    <div
      className="absolute z-40"
      style={{ left: anchorX - 60, top: anchorY + 40 }}
    >
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--sw-radius-pill,999px)] bg-neutral-900/95 border border-white/10 shadow-lg cursor-pointer hover:bg-neutral-800/95 transition-colors"
        onClick={onExpand}
      >
        <span className="text-[10px] text-white/60 font-medium whitespace-nowrap">
          Other options ({results.length})
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
            onDismiss();
          }}
          className="p-0.5 text-white/30 hover:text-white/60"
          aria-label="Dismiss remaining options"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
