import React from 'react';
import { mc } from '@/lib/microcopy';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const InspectorEmpty = () => {
  const setActiveTool = useWorkspaceStore((s) => s.setActiveTool);

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <h3 className="text-sm font-medium text-white/90 mb-2">
        {mc.inspector.empty.title}
      </h3>
      <p className="text-xs text-white/50 mb-4 max-w-[260px]">
        {mc.inspector.empty.body}
      </p>
      <button
        onClick={() => setActiveTool('import')}
        className="px-4 py-2 rounded-[var(--sw-radius-panel)] bg-[var(--sw-accent)] text-white text-sm font-medium transition-opacity hover:opacity-90"
      >
        {mc.inspector.empty.importButton}
      </button>
    </div>
  );
};
