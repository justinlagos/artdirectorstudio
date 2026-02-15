import React, { useState } from 'react';
import {
  Upload,
  Scan,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  MoreHorizontal,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';

type DockTool = 'import' | 'analyze' | 'regenerate' | 'effects' | 'funlab';

const DOCK_TOOLS: { id: DockTool; icon: React.ElementType }[] = [
  { id: 'import', icon: Upload },
  { id: 'analyze', icon: Scan },
  { id: 'regenerate', icon: RefreshCw },
  { id: 'effects', icon: SlidersHorizontal },
  { id: 'funlab', icon: Sparkles },
];

export const BottomDock: React.FC = () => {
  const activeTool = useWorkspaceStore((s) => s.activeTool);
  const setActiveTool = useWorkspaceStore((s) => s.setActiveTool);
  const toggleReferencesPanel = useWorkspaceStore((s) => s.toggleReferencesPanel);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex items-center justify-center gap-1 px-4 py-2 bg-neutral-950/95 border-t border-white/5 safe-bottom">
      {DOCK_TOOLS.map(({ id, icon: Icon }) => {
        const active = activeTool === id;
        return (
          <button
            key={id}
            onClick={() => setActiveTool(active ? null : id)}
            className={`flex items-center justify-center w-10 h-10 rounded-[var(--sw-radius-panel)] transition-colors ${
              active
                ? 'bg-[var(--sw-accent-dim)] text-[var(--sw-accent)]'
                : 'text-white/50 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <Icon className="w-5 h-5" />
          </button>
        );
      })}
      <div className="relative">
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-[var(--sw-radius-panel)] text-white/50 hover:text-white/70 hover:bg-white/5 transition-colors"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
        {moreOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setMoreOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute bottom-full left-0 mb-1 p-2 rounded-[var(--sw-radius-panel)] bg-neutral-900 border border-white/10 shadow-[var(--sw-shadow-float)] z-40">
              <button
                onClick={() => {
                  toggleReferencesPanel();
                  setMoreOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-xs text-white/80 hover:bg-white/5 rounded"
              >
                References
              </button>
              <button
                onClick={() => {
                  setActiveTool(null);
                  setMoreOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-xs text-white/80 hover:bg-white/5 rounded"
              >
                Versions
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
