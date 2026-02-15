import React, { useState } from 'react';
import { mc } from '@/lib/microcopy';
import { useCredits } from '@/hooks/useCredits';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { CreditsDrawer } from './inspector/drawers/CreditsDrawer';
import { X } from 'lucide-react';

export const CreditsDisplay: React.FC = () => {
  const { balance, pendingCount, loading, isUnlimited } = useCredits();
  const jobs = useWorkspaceStore((s) => s.jobs);
  const hasRunningJob = jobs.some((j) => j.status === 'running');
  const [showDrawer, setShowDrawer] = useState(false);

  const displayBalance = loading
    ? '…'
    : isUnlimited
      ? '∞'
      : balance ?? 0;

  return (
    <>
      <button
        onClick={() => setShowDrawer(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--sw-radius-pill)] bg-white/5 hover:bg-white/10 text-xs font-medium text-white/80 transition-colors"
        title={mc.tooltips.creditsPill}
      >
        <span>{mc.credits.label}:</span>
        <span className="tabular-nums">{displayBalance}</span>
        {pendingCount > 0 && !isUnlimited && (
          <span className="text-[10px] text-white/30">({pendingCount} pending)</span>
        )}
        {hasRunningJob && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        )}
      </button>

      {/* Credits drawer popover */}
      {showDrawer && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/30"
            onClick={() => setShowDrawer(false)}
          />
          <div className="fixed top-12 right-4 z-50 w-80 max-h-[80vh] bg-neutral-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
              <h3 className="text-sm font-medium text-white/90">{mc.credits.label}</h3>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1 text-white/40 hover:text-white/70 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CreditsDrawer />
            </div>
          </div>
        </>
      )}
    </>
  );
};
