import React, { useState, useEffect } from 'react';
import { mc } from '@/lib/microcopy';
import { useCanvasStore } from '@/store/canvasStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useBreakpoint } from '@/hooks/use-mobile';
import { X, Check } from 'lucide-react';

const STORAGE_KEY = 'artdirector_onboarding';

interface OnboardingState {
  droppedImage: boolean;
  completedAnalyze: boolean;
  completedRegenerate: boolean;
  dismissed: boolean;
}

const defaultState: OnboardingState = {
  droppedImage: false,
  completedAnalyze: false,
  completedRegenerate: false,
  dismissed: false,
};

function loadState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...defaultState, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return defaultState;
}

function saveState(s: OnboardingState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export const MicroOnboarding: React.FC = () => {
  const [state, setState] = useState<OnboardingState>(loadState);
  const breakpoint = useBreakpoint();

  const items = useCanvasStore((s) => s.items);
  const jobs = useWorkspaceStore((s) => s.jobs);

  const hasImage = items.some(
    (i) => !i.deleted_at && (i.type === 'image' || i.type === 'reference')
  );

  // Step 1: Drop image — mark when any image exists on the board
  useEffect(() => {
    if (!hasImage) return;
    setState((prev) => {
      if (prev.droppedImage) return prev;
      const next = { ...prev, droppedImage: true };
      saveState(next);
      return next;
    });
  }, [hasImage]);

  // Step 2: Analyze complete — mark when an analyze job finishes successfully
  useEffect(() => {
    const analyzeCompleted = jobs.some(
      (j) => j.action === 'analyze' && j.status === 'done'
    );
    if (!analyzeCompleted) return;
    setState((prev) => {
      if (prev.completedAnalyze) return prev;
      const next = { ...prev, completedAnalyze: true };
      saveState(next);
      return next;
    });
  }, [jobs]);

  // Step 3: Regenerate complete — mark when a regenerate job finishes successfully
  useEffect(() => {
    const regenCompleted = jobs.some(
      (j) => j.action === 'regenerate' && j.status === 'done'
    );
    if (!regenCompleted) return;
    setState((prev) => {
      if (prev.completedRegenerate) return prev;
      const next = { ...prev, completedRegenerate: true };
      saveState(next);
      return next;
    });
  }, [jobs]);

  const allDone =
    state.droppedImage && state.completedAnalyze && state.completedRegenerate;
  const dismissed = state.dismissed;

  const handleDismiss = () => {
    const next = { ...state, dismissed: true };
    setState(next);
    saveState(next);
  };

  if (allDone || dismissed) return null;

  const steps = [
    { key: 'droppedImage', label: mc.onboarding.step1, done: state.droppedImage },
    { key: 'completedAnalyze', label: mc.onboarding.step2, done: state.completedAnalyze },
    {
      key: 'completedRegenerate',
      label: mc.onboarding.step3,
      done: state.completedRegenerate,
    },
  ];

  if (breakpoint === 'mobile') {
    const firstUndone = steps.find((s) => !s.done);
    return (
      <div className="fixed bottom-20 left-4 right-4 z-30 px-4 py-2 rounded-[var(--sw-radius-panel)] bg-neutral-900/95 border border-white/10 shadow-[var(--sw-shadow-float)] flex items-center justify-between gap-2">
        <span className="text-xs text-white/80">
          {firstUndone ? firstUndone.label : mc.onboarding.step1}
        </span>
        <button
          onClick={handleDismiss}
          className="p-1 text-white/40 hover:text-white/70 shrink-0"
          aria-label="Dismiss onboarding"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (breakpoint === 'tablet') {
    const firstUndone = steps.find((s) => !s.done);
    return (
      <div className="fixed bottom-20 left-4 right-4 z-30 px-4 py-2 rounded-[var(--sw-radius-panel)] bg-neutral-900/95 border border-white/10 shadow-[var(--sw-shadow-float)] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {steps.map((s) => (
            <span
              key={s.key}
              className={`text-xs flex items-center gap-1.5 ${
                s.done ? 'text-white/50' : 'text-white/80'
              }`}
            >
              {s.done ? <Check className="w-3 h-3 text-green-500/70" /> : null}
              {s.label}
            </span>
          ))}
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 text-white/40 hover:text-white/70 shrink-0"
          aria-label="Dismiss onboarding"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-[calc(var(--sw-versions-height)+var(--sw-space-4))] left-4 z-30 w-48 p-3 rounded-[var(--sw-radius-card)] bg-neutral-900/95 border border-white/10 shadow-[var(--sw-shadow-float)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-white/80">{mc.misc.gettingStarted}</span>
        <button
          onClick={handleDismiss}
          className="p-0.5 text-white/40 hover:text-white/70"
          aria-label="Dismiss onboarding"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-1.5">
        {steps.map((s) => (
          <div
            key={s.key}
            className={`flex items-center gap-2 text-xs ${
              s.done ? 'text-white/50' : 'text-white/80'
            }`}
          >
            {s.done ? (
              <Check className="w-3 h-3 text-green-500/70 shrink-0" />
            ) : (
              <span className="w-3 h-3 rounded-full border border-white/30 shrink-0" />
            )}
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
};
