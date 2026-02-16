import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCanvasStore } from '@/store/canvasStore';
import { useCanvasSync } from '@/hooks/canvas/useCanvasSync';
import { useCanvasKeyboard } from '@/hooks/canvas/useCanvasKeyboard';
import { useCanvasViewport } from '@/hooks/canvas/useCanvasViewport';
import { useWorkspaceLayout } from '@/hooks/useWorkspaceLayout';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { reconcileJobsOnLoad } from '@/lib/reconcileJobs';
import { toast } from 'sonner';
import { mc } from '@/lib/microcopy';

import { TabsBar } from './TabsBar';
import { ToolRail } from './ToolRail';
import { ReferencesPanel } from './ReferencesPanel';
import { InspectorPanel } from './InspectorPanel';
import { VersionsStrip } from './VersionsStrip';
import { BottomDock } from './responsive/BottomDock';
import { BottomSheet } from './responsive/BottomSheet';
import { MicroOnboarding } from './onboarding/MicroOnboarding';
import { MobilePanToggle } from './MobilePanToggle';
import { ConfirmDialog } from './ConfirmDialog';

import { DrawerContent } from './inspector/DrawerContent';
import { CanvasViewport } from '@/components/canvas/CanvasViewport';
import { ViewportControls } from '@/components/canvas/ViewportControls';
import { DevModePanel } from '@/components/DevModePanel';

export const WorkspaceShell: React.FC = () => {
  const { user } = useAuth();
  const layoutBreakpoint = useWorkspaceLayout();
  const referencesPanelOpen = useWorkspaceStore((s) => s.referencesPanelOpen);
  const activeTool = useWorkspaceStore((s) => s.activeTool);
  const closeInspector = useWorkspaceStore((s) => s.closeInspector);
  const confirmDialog = useWorkspaceStore((s) => s.confirmDialog);
  const closeConfirmDialog = useWorkspaceStore((s) => s.closeConfirmDialog);
  const selectedItemIds = useCanvasStore((s) => s.selectedItemIds);
  const allItems = useCanvasStore((s) => s.items);

  // Accessibility: announce selection state
  const selectionAnnouncement = useMemo(() => {
    if (selectedItemIds.size === 0) return mc.a11y.nothingSelected;
    const firstId = [...selectedItemIds][0];
    const item = allItems.find((i) => i.id === firstId);
    if (!item) return mc.a11y.nothingSelected;
    return item.type === 'reference' ? mc.a11y.referenceSelected : mc.a11y.workingImageSelected;
  }, [selectedItemIds, allItems]);

  const { loadProjects, createCanvas, loadCanvasItems } = useCanvasSync(
    user?.id
  );
  const { zoomToFit } = useCanvasViewport();
  const viewportRef = useRef<HTMLDivElement>(null);

  useCanvasKeyboard();

  // Load projects
  useEffect(() => {
    if (user?.id) {
      loadProjects();
    }
  }, [user?.id, loadProjects]);

  // Session recovery on mount — reconcile against server truth
  useEffect(() => {
    if (!user?.id) return;
    reconcileJobsOnLoad(user.id).then(() => {
      const jobs = useWorkspaceStore.getState().jobs;
      const doneJobs = jobs.filter((j) => j.status === 'done');
      const failedJobs = jobs.filter((j) => j.status === 'failed');
      if (doneJobs.length > 0) {
        toast.success(mc.toasts.success.sessionRecovered);
      }
      if (failedJobs.length > 0) {
        toast.info(mc.toasts.errors.creditsRefundNotice);
      }
    }).catch((err) => {
      console.error('[WorkspaceShell] job reconciliation error:', err);
    });
  }, [user?.id]);

  const handleCreateCanvas = useCallback(async () => {
    const state = useCanvasStore.getState();
    if (state.currentProjectId) {
      await createCanvas(state.currentProjectId);
    }
  }, [createCanvas]);

  const clearTabBadge = useWorkspaceStore((s) => s.clearTabBadge);

  const handleSwitchCanvas = useCallback(
    async (canvasId: string) => {
      clearTabBadge(canvasId);
      await loadCanvasItems(canvasId);
    },
    [loadCanvasItems, clearTabBadge]
  );

  const handleZoomToFit = useCallback(() => {
    if (viewportRef.current) {
      zoomToFit(viewportRef.current.getBoundingClientRect());
    }
  }, [zoomToFit]);

  const toolRailExpanded = useWorkspaceStore((s) => s.toolRailExpanded);

  const isDesktop =
    layoutBreakpoint === 'desktop-wide' ||
    layoutBreakpoint === 'desktop-narrow';
  const isTablet = layoutBreakpoint === 'tablet';
  const isMobile = layoutBreakpoint === 'mobile';
  const showToolRail = isDesktop;
  const showBottomDock = isTablet || isMobile;
  const showReferencesInGrid = isDesktop && referencesPanelOpen;
  const refsColWidth =
    layoutBreakpoint === 'desktop-narrow' && !referencesPanelOpen
      ? '0px'
      : 'var(--sw-references-width)';

  const railWidth = toolRailExpanded ? 'var(--sw-rail-width-expanded)' : 'var(--sw-rail-width)';
  const gridCols = isDesktop
    ? `${railWidth} ${refsColWidth} 1fr var(--sw-inspector-width)`
    : '1fr';
  const gridRows = isDesktop
    ? 'var(--sw-tabs-height) 1fr var(--sw-versions-height)'
    : 'var(--sw-tabs-height) 1fr';

  return (
    <div className="flex flex-col h-screen bg-neutral-950 overflow-hidden">
      {/* CSS Grid layout */}
      <div
        className="grid h-full w-full flex-1 min-h-0"
        style={{
          gridTemplateColumns: gridCols,
          gridTemplateRows: gridRows,
        }}
      >
        {/* TabsBar - row 1, all columns */}
        <div className="col-span-full row-start-1 shrink-0">
          <TabsBar
            onCreateCanvas={handleCreateCanvas}
            onSwitchCanvas={handleSwitchCanvas}
          />
        </div>

        {/* ToolRail - desktop only */}
        {showToolRail && (
          <div className="row-start-2 overflow-hidden shrink-0">
            <ToolRail />
          </div>
        )}

        {/* ReferencesPanel - desktop only when open */}
        {showToolRail && (
          <div
            className="row-start-2 overflow-hidden transition-all duration-200 shrink-0"
            style={{
              minWidth: 0,
              width: showReferencesInGrid ? undefined : 0,
              overflow: showReferencesInGrid ? 'auto' : 'hidden',
            }}
          >
            {showReferencesInGrid && <ReferencesPanel />}
          </div>
        )}

        {/* Board - center, always visible */}
        <div
          ref={viewportRef}
          className="row-start-2 relative overflow-hidden min-w-0"
        >
          <CanvasViewport />

          {/* Viewport controls - floating bottom-right */}
          <div className="absolute bottom-2 right-2 z-10">
            <ViewportControls onZoomToFit={handleZoomToFit} />
          </div>

          {/* Mobile pan toggle */}
          {isMobile && <MobilePanToggle />}
        </div>

        {/* InspectorPanel - desktop only, in grid */}
        {showToolRail && (
          <div className="row-start-2 overflow-hidden shrink-0">
            <InspectorPanel />
          </div>
        )}

        {/* VersionsStrip - row 3, desktop only */}
        {isDesktop && (
          <div
            className="row-start-3 col-span-full overflow-hidden"
            style={{ gridColumn: '1 / -1' }}
          >
            <VersionsStrip />
          </div>
        )}
      </div>

      {/* BottomDock - tablet/mobile */}
      {showBottomDock && <BottomDock />}

      {/* BottomSheet - mobile Inspector with real drawer content */}
      {isMobile && activeTool !== null && activeTool !== 'references' && (
        <BottomSheet
          open={true}
          onClose={closeInspector}
          primaryAction={
            <div className="text-sm font-medium text-white/90">
              {activeTool.charAt(0).toUpperCase() + activeTool.slice(1)}
            </div>
          }
        >
          <DrawerContent activeTool={activeTool} />
        </BottomSheet>
      )}

      {/* Right sheet for tablet - Inspector */}
      {isTablet && activeTool !== null && (
        <div
          className="fixed inset-y-0 right-0 z-40 w-[var(--sw-inspector-width)] bg-neutral-950 border-l border-white/5 shadow-[var(--sw-shadow-float)] animate-[slide-in-right_0.2s_ease-out]"
          style={{ top: 'var(--sw-tabs-height)' }}
        >
          <InspectorPanel />
        </div>
      )}

      {/* MicroOnboarding */}
      <MicroOnboarding />

      {/* Screen reader selection announcer */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectionAnnouncement}
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        body={confirmDialog.body}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        destructive={confirmDialog.destructive}
        onConfirm={() => {
          confirmDialog.onConfirm?.();
          closeConfirmDialog();
        }}
        onCancel={closeConfirmDialog}
      />

      <DevModePanel />
    </div>
  );
};
