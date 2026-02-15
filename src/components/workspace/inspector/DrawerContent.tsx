import React, { useState, useCallback } from 'react';
import { useWorkspaceStore, type WorkspaceTool } from '@/store/workspaceStore';
import { useCanvasStore } from '@/store/canvasStore';
import { useAuth } from '@/contexts/AuthContext';
import { mc } from '@/lib/microcopy';
import { InspectorEmpty } from './InspectorEmpty';
import { InspectorItemContext } from './InspectorItemContext';
import { AuthDrawer } from './drawers/AuthDrawer';
import { ImportDrawer } from './drawers/ImportDrawer';
import { AnalyzeDrawer } from './drawers/AnalyzeDrawer';
import { RegenerateDrawer } from './drawers/RegenerateDrawer';
import { EffectsDrawer } from './drawers/EffectsDrawer';
import { FunLabDrawer } from './drawers/FunLabDrawer';

interface DrawerContentProps {
  activeTool: WorkspaceTool;
}

/** Tools that require a working image selection */
const WORKING_IMAGE_TOOLS: WorkspaceTool[] = ['analyze', 'regenerate', 'effects', 'funlab'];

/**
 * Shared drawer content renderer used by both InspectorPanel (desktop)
 * and BottomSheet (mobile).
 */
export const DrawerContent: React.FC<DrawerContentProps> = ({ activeTool }) => {
  const { user } = useAuth();
  const setActiveTool = useWorkspaceStore((s) => s.setActiveTool);
  const selectedItemIds = useCanvasStore((s) => s.selectedItemIds);
  const items = useCanvasStore((s) => s.items);
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);

  const selectedId = [...selectedItemIds][0];
  const selectedItem = selectedId
    ? items.find((i) => i.id === selectedId && !i.deleted_at)
    : null;

  const isMultiSelect = selectedItemIds.size > 1;
  const isReference = selectedItem?.type === 'reference';

  const handleRequestAuth = useCallback(() => {
    if (!user) setShowAuthOverlay(true);
  }, [user]);

  const handleAuthClose = useCallback(() => {
    setShowAuthOverlay(false);
  }, []);

  const handleSwitchToAnalyze = useCallback(() => {
    setActiveTool('analyze');
  }, [setActiveTool]);

  const renderDrawer = () => {
    // Edge case: reference selected + working-image tool clicked
    if (activeTool && WORKING_IMAGE_TOOLS.includes(activeTool) && isReference) {
      return (
        <div className="p-4 flex flex-col items-center justify-center h-full text-center">
          <p className="text-sm font-medium text-white/50">
            {mc.misc.referenceToolBlock}
          </p>
          <button
            onClick={() => useCanvasStore.clearSelection()}
            className="mt-3 px-4 py-2 rounded-[var(--sw-radius-panel)] bg-white/10 hover:bg-white/15 text-white/70 text-sm font-medium transition-colors"
          >
            Deselect
          </button>
        </div>
      );
    }

    switch (activeTool) {
      case 'import':
        return <ImportDrawer />;
      case 'analyze':
        return <AnalyzeDrawer onRequestAuth={handleRequestAuth} />;
      case 'regenerate':
        return (
          <RegenerateDrawer
            onRequestAuth={handleRequestAuth}
            onSwitchToAnalyze={handleSwitchToAnalyze}
          />
        );
      case 'effects':
        return <EffectsDrawer onRequestAuth={handleRequestAuth} />;
      case 'funlab':
        return <FunLabDrawer onRequestAuth={handleRequestAuth} />;
      default:
        if (selectedItem) return <InspectorItemContext item={selectedItem} />;
        return <InspectorEmpty />;
    }
  };

  return (
    <div className="relative flex-1 overflow-y-auto">
      {/* Multi-select note */}
      {isMultiSelect && activeTool && WORKING_IMAGE_TOOLS.includes(activeTool) && (
        <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/10">
          <p className="text-[10px] text-amber-400/70">{mc.misc.multiSelectNote}</p>
        </div>
      )}
      {renderDrawer()}
      {showAuthOverlay && !user && <AuthDrawer onClose={handleAuthClose} />}
    </div>
  );
};
