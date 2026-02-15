import React, { useRef, useState, useEffect, useCallback } from 'react';
import { mc } from '@/lib/microcopy';
import { useCanvasStore } from '@/store/canvasStore';
import { useImageVersions } from '@/hooks/useImageVersions';
import { Upload, Scan, RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react';

const ACTION_ICONS: Record<string, React.ElementType> = {
  import: Upload,
  analyze: Scan,
  regenerate: RefreshCw,
  effects: SlidersHorizontal,
  funlab: Sparkles,
};

export const VersionsStrip: React.FC = () => {
  const selectedItemIds = useCanvasStore((s) => s.selectedItemIds);
  const items = useCanvasStore((s) => s.items);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const selectedId = [...selectedItemIds][0];
  const selectedItem = selectedId
    ? items.find((i) => i.id === selectedId && !i.deleted_at)
    : null;

  const rootImageId = selectedItem?.root_image_id ?? null;
  const { versions, isLoading, switchVersion } = useImageVersions(rootImageId);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [versions, updateScrollState]);

  if (!selectedItem || !rootImageId) {
    return (
      <div
        className="flex items-center justify-center border-t border-white/5 bg-neutral-950/95"
        style={{ height: 'var(--sw-versions-height)' }}
      >
        <div className="text-center">
          <p className="text-xs font-medium text-white/50">
            {mc.workspace.empty.versionsEmpty.title}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">
            {mc.workspace.empty.versionsEmpty.body}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative border-t border-white/5 bg-neutral-950/95"
      style={{ height: 'var(--sw-versions-height)' }}
    >
      {/* Scroll shadow left */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-r from-neutral-950 to-transparent pointer-events-none" />
      )}

      {/* Scroll shadow right */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-l from-neutral-950 to-transparent pointer-events-none" />
      )}

      <div
        ref={scrollRef}
        className="flex items-center h-full px-3 gap-2 overflow-x-auto scrollbar-hide"
      >
        {isLoading ? (
          <p className="text-xs text-white/40">{mc.loading.loading}</p>
        ) : versions.length === 0 ? (
          <div className="text-center w-full">
            <p className="text-xs text-white/50">{mc.workspace.empty.versionsEmpty.title}</p>
          </div>
        ) : (
          versions.map((version, idx) => {
            const isActive = selectedItem.image_version_id === version.id;
            const Icon = ACTION_ICONS[version.source_action] ?? Upload;
            const time = new Date(version.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <button
                key={version.id}
                onClick={() => switchVersion(selectedItem.id, version)}
                className={`flex flex-col items-center shrink-0 rounded-lg p-1.5 transition-all ${
                  isActive
                    ? 'ring-2 ring-[var(--sw-accent)] bg-white/5'
                    : 'hover:bg-white/5'
                }`}
                title={mc.tooltips.versionClick}
                aria-label={`Version ${idx + 1}, ${version.source_action}`}
              >
                <div className="w-12 h-12 rounded overflow-hidden bg-neutral-800 mb-1">
                  {version.thumbnail_url ? (
                    <img
                      src={version.thumbnail_url}
                      alt={`v${idx + 1}`}
                      className="w-full h-full object-cover"
                      draggable={false}
                      loading={idx > 15 ? 'lazy' : undefined}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon className="w-4 h-4 text-white/30" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Icon className="w-3 h-3 text-white/40" />
                  <span className="text-[10px] text-white/50 tabular-nums">
                    v{idx + 1}
                  </span>
                </div>
                <span className="text-[9px] text-white/30">{time}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
