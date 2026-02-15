import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Maximize2, Check } from 'lucide-react';
import { mc } from '@/lib/microcopy';

export interface FunLabResult {
  url: string;
  thumbnail_url?: string;
  version_id?: string;
}

interface ResultTilesProps {
  results: FunLabResult[];
  anchorX: number;
  anchorY: number;
  onCommit: (result: FunLabResult) => void;
  onDismissAll: () => void;
}

const TILE_SIZE = 140;
const TILE_GAP = 8;
const AUTO_COLLAPSE_MS = 20_000;
const AUTO_DISMISS_MS = 60_000;
const LONG_PRESS_MS = 500;

export const ResultTiles: React.FC<ResultTilesProps> = ({
  results,
  anchorX,
  anchorY,
  onCommit,
  onDismissAll,
}) => {
  const [committedIndex, setCommittedIndex] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-collapse after 20s if nothing committed
  useEffect(() => {
    if (committedIndex !== null) return;
    collapseTimerRef.current = setTimeout(() => setCollapsed(true), AUTO_COLLAPSE_MS);
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, [committedIndex]);

  // Auto-dismiss after 60s if nothing committed
  useEffect(() => {
    if (committedIndex !== null) return;
    dismissTimerRef.current = setTimeout(() => {
      setDismissed(true);
      onDismissAll();
    }, AUTO_DISMISS_MS);
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [committedIndex, onDismissAll]);

  // Start collapse timer after commit for remaining tiles
  useEffect(() => {
    if (committedIndex === null) return;
    const timer = setTimeout(() => setCollapsed(true), AUTO_COLLAPSE_MS);
    return () => clearTimeout(timer);
  }, [committedIndex]);

  const handleCommit = useCallback(
    (result: FunLabResult, index: number) => {
      setCommittedIndex(index);
      onCommit(result);
    },
    [onCommit]
  );

  const handleLongPressStart = useCallback((url: string) => {
    longPressRef.current = setTimeout(() => setPreviewUrl(url), LONG_PRESS_MS);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  if (dismissed) return null;

  const remainingResults = committedIndex !== null
    ? results.filter((_, i) => i !== committedIndex)
    : results;

  const tileY = anchorY + 40;
  const totalWidth = results.length * TILE_SIZE + (results.length - 1) * TILE_GAP;
  const startX = anchorX - totalWidth / 2;

  // Collapsed state → show DiscardableChip inline
  if (collapsed && remainingResults.length > 0) {
    return (
      <div
        className="absolute z-40"
        style={{ left: anchorX - 60, top: tileY }}
      >
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900/95 border border-white/10 shadow-lg cursor-pointer hover:bg-neutral-800/95 transition-colors"
          onClick={() => setCollapsed(false)}
        >
          <span className="text-[10px] text-white/60 font-medium whitespace-nowrap">
            Other options ({remainingResults.length})
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
              onDismissAll();
            }}
            className="p-0.5 text-white/30 hover:text-white/60"
            aria-label="Dismiss remaining options"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Tiles */}
      {results.map((result, idx) => {
        const isCommitted = committedIndex === idx;
        const isOther = committedIndex !== null && !isCommitted;
        const x = startX + idx * (TILE_SIZE + TILE_GAP);

        return (
          <div
            key={idx}
            className="absolute z-40 transition-all duration-300"
            style={{
              left: x,
              top: tileY,
              width: TILE_SIZE,
              height: TILE_SIZE,
              opacity: isOther ? 0.6 : 1,
            }}
          >
            <div
              className={`relative w-full h-full rounded-[var(--sw-radius-card)] overflow-hidden border transition-all ${
                isCommitted
                  ? 'border-green-500/50 shadow-[0_0_12px_rgba(34,197,94,0.2)]'
                  : 'border-white/10 hover:border-white/20 shadow-lg'
              }`}
              onClick={() => {
                if (committedIndex === null) handleCommit(result, idx);
              }}
              onMouseDown={() => handleLongPressStart(result.url)}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              onTouchStart={() => handleLongPressStart(result.url)}
              onTouchEnd={handleLongPressEnd}
              style={{ cursor: committedIndex === null ? 'pointer' : 'default' }}
            >
              <img
                src={result.thumbnail_url || result.url}
                alt={`Option ${idx + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Committed check */}
              {isCommitted && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-500/10">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}

              {/* Option number */}
              <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-neutral-900/80 flex items-center justify-center">
                <span className="text-[10px] text-white/70 font-bold">{idx + 1}</span>
              </div>

              {/* Expand icon */}
              {!isCommitted && (
                <button
                  className="absolute top-1.5 right-1.5 p-1 rounded bg-neutral-900/80 text-white/50 hover:text-white/80 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewUrl(result.url);
                  }}
                  aria-label="Preview full size"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              )}

              {/* Dismiss X for non-committed tiles after a commit */}
              {isOther && (
                <button
                  className="absolute top-1.5 right-1.5 p-1 rounded bg-neutral-900/80 text-white/50 hover:text-white/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Mark as collapsed to hide
                    setCollapsed(true);
                  }}
                  aria-label="Dismiss"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Full-size preview overlay */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewUrl(null)}
        >
          <img
            src={previewUrl}
            alt="Full size preview"
            className="max-w-[80vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
          />
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900/80 text-white/60 hover:text-white"
            onClick={() => setPreviewUrl(null)}
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
};
