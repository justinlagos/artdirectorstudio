import React from 'react';
import {
  Upload,
  FolderOpen,
  Scan,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { mc } from '@/lib/microcopy';

type RailTool = 'import' | 'references' | 'analyze' | 'regenerate' | 'effects' | 'funlab';

const TOOLS: { id: RailTool; icon: React.ElementType; label: string; tooltip: string }[] = [
  { id: 'import', icon: Upload, label: 'Import', tooltip: mc.tooltips.railImport },
  { id: 'references', icon: FolderOpen, label: 'References', tooltip: mc.tooltips.railReferences },
  { id: 'analyze', icon: Scan, label: 'Analyze', tooltip: mc.tooltips.railAnalyze },
  { id: 'regenerate', icon: RefreshCw, label: 'Regenerate', tooltip: mc.tooltips.railRegenerate },
  { id: 'effects', icon: SlidersHorizontal, label: 'Effects', tooltip: mc.tooltips.railEffects },
  { id: 'funlab', icon: Sparkles, label: 'Fun Lab', tooltip: mc.tooltips.railFunLab },
];

export const ToolRail: React.FC = () => {
  const activeTool = useWorkspaceStore((s) => s.activeTool);
  const setActiveTool = useWorkspaceStore((s) => s.setActiveTool);
  const toggleReferencesPanel = useWorkspaceStore((s) => s.toggleReferencesPanel);
  const referencesPanelOpen = useWorkspaceStore((s) => s.referencesPanelOpen);
  const expanded = useWorkspaceStore((s) => s.toolRailExpanded);
  const toggleExpanded = useWorkspaceStore((s) => s.toggleToolRailExpanded);

  return (
    <div
      className="flex flex-col items-stretch py-2 gap-1 bg-neutral-950 border-r border-white/5 transition-[width] duration-200 ease-out overflow-hidden"
      style={{ width: expanded ? 'var(--sw-rail-width-expanded)' : 'var(--sw-rail-width)' }}
      role="toolbar"
      aria-label="Tool rail"
    >
      {TOOLS.map(({ id, icon: Icon, label, tooltip }) => {
        if (id === 'references') {
          const active = referencesPanelOpen;
          return (
            <button
              key={id}
              onClick={() => toggleReferencesPanel()}
              className={`flex items-center gap-2 mx-1 h-10 rounded-[var(--sw-radius-panel)] transition-colors ${
                expanded ? 'px-3 justify-start' : 'justify-center'
              } ${
                active
                  ? 'bg-[var(--sw-accent-dim)] text-[var(--sw-accent)]'
                  : 'text-white/50 hover:text-white/70 hover:bg-white/5'
              }`}
              title={tooltip}
              aria-label={tooltip}
              aria-pressed={active}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {expanded && (
                <span className="text-xs font-medium truncate">{label}</span>
              )}
            </button>
          );
        }

        const active = activeTool === id;
        return (
          <button
            key={id}
            onClick={() => setActiveTool(active ? null : id)}
            className={`flex items-center gap-2 mx-1 h-10 rounded-[var(--sw-radius-panel)] transition-colors ${
              expanded ? 'px-3 justify-start' : 'justify-center'
            } ${
              active
                ? 'bg-[var(--sw-accent-dim)] text-[var(--sw-accent)]'
                : 'text-white/50 hover:text-white/70 hover:bg-white/5'
            }`}
            title={tooltip}
            aria-label={tooltip}
            aria-pressed={active}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {expanded && (
              <span className="text-xs font-medium truncate">{label}</span>
            )}
          </button>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Expand/collapse toggle */}
      <button
        onClick={toggleExpanded}
        className="flex items-center justify-center mx-1 h-10 rounded-[var(--sw-radius-panel)] text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
        title={expanded ? mc.toolRail.collapse : mc.toolRail.expand}
        aria-label={expanded ? mc.toolRail.collapse : mc.toolRail.expand}
      >
        {expanded ? (
          <PanelLeftClose className="w-4 h-4" />
        ) : (
          <PanelLeftOpen className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};
