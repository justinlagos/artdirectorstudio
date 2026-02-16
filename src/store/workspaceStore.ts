import { create } from 'zustand';

function getTabId(): string {
  try {
    let tabId = sessionStorage.getItem('ads_tab_id');
    if (!tabId) {
      tabId = crypto.randomUUID();
      sessionStorage.setItem('ads_tab_id', tabId);
    }
    return tabId;
  } catch {
    return 'default-tab';
  }
}

const TAB_ID = getTabId();
const TAB_JOBS_KEY = `ads_tab_${TAB_ID}_workspace_jobs`;
const TAB_EFFECTS_KEY = `ads_tab_${TAB_ID}_effects_preview`;

export type WorkspaceTool =
  | 'import'
  | 'references'
  | 'analyze'
  | 'regenerate'
  | 'effects'
  | 'funlab'
  | null;

export type LayoutBreakpoint =
  | 'desktop-wide'
  | 'desktop-narrow'
  | 'tablet'
  | 'mobile';

export interface AsyncJob {
  id: string;
  tab_id: string;
  item_id: string;
  root_image_id: string | null;
  source_version_id: string | null;
  reservation_id: string | null;
  action: string;
  expected_outputs: number;
  status: 'pending' | 'running' | 'done' | 'failed';
}

export interface EffectLayer {
  id: string;
  type: string;
  [key: string]: unknown;
}

const TOOL_RAIL_EXPANDED_KEY = 'ads_tool_rail_expanded';
const SHOW_GRID_KEY = 'ads_show_grid';

function loadBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === 'true';
  } catch {
    return fallback;
  }
}

function saveBool(key: string, value: boolean) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Ignore
  }
}

function persistJobs(jobs: AsyncJob[]) {
  try {
    const minimal = jobs.map((j) => ({
      id: j.id,
      tab_id: j.tab_id,
      item_id: j.item_id,
      root_image_id: j.root_image_id,
      source_version_id: j.source_version_id,
      reservation_id: j.reservation_id,
      action: j.action,
      expected_outputs: j.expected_outputs,
      status: j.status,
    }));
    sessionStorage.setItem(TAB_JOBS_KEY, JSON.stringify(minimal));
  } catch {
    // Ignore storage errors
  }
}

function loadPersistedJobs(): AsyncJob[] {
  try {
    const raw = sessionStorage.getItem(TAB_JOBS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AsyncJob[];
  } catch {
    return [];
  }
}

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  onConfirm: (() => void) | null;
}

interface WorkspaceState {
  activeTool: WorkspaceTool;
  referencesPanelOpen: boolean;
  layoutBreakpoint: LayoutBreakpoint;
  jobs: AsyncJob[];
  effectsPreviewStack: EffectLayer[];
  panMode: boolean;
  confirmDialog: ConfirmDialogState;
  tabBadges: Record<string, number>; // canvasId → count of new results
  toolRailExpanded: boolean;
  showGrid: boolean;
}

interface WorkspaceActions {
  setActiveTool: (tool: WorkspaceTool) => void;
  closeInspector: () => void;
  toggleReferencesPanel: () => void;
  setPanMode: (v: boolean) => void;
  setLayoutBreakpoint: (bp: LayoutBreakpoint) => void;
  addJob: (job: AsyncJob) => void;
  updateJob: (id: string, patch: Partial<AsyncJob>) => void;
  removeJob: (id: string) => void;
  setEffectsPreviewStack: (stack: EffectLayer[]) => void;
  resetEffectsPreview: () => void;
  hydrateJobsFromSession: () => AsyncJob[];
  clearPersistedJobs: () => void;
  showConfirmDialog: (config: Omit<ConfirmDialogState, 'open' | 'onConfirm'> & { onConfirm: () => void }) => void;
  closeConfirmDialog: () => void;
  incrementTabBadge: (canvasId: string) => void;
  clearTabBadge: (canvasId: string) => void;
  toggleToolRailExpanded: () => void;
  toggleShowGrid: () => void;
}

type WorkspaceStore = WorkspaceState & WorkspaceActions;

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  activeTool: null,
  referencesPanelOpen: false,
  layoutBreakpoint: 'desktop-wide',
  jobs: [],
  effectsPreviewStack: [],
  panMode: false,
  confirmDialog: {
    open: false,
    title: '',
    body: '',
    confirmLabel: '',
    cancelLabel: '',
    destructive: false,
    onConfirm: null,
  },
  tabBadges: {},
  toolRailExpanded: loadBool(TOOL_RAIL_EXPANDED_KEY, false),
  showGrid: loadBool(SHOW_GRID_KEY, true),

  setActiveTool: (tool) =>
    set((state) => {
      if (tool === 'references') {
        return state;
      }
      if (state.activeTool === tool) {
        return { activeTool: null };
      }
      return { activeTool: tool };
    }),

  closeInspector: () => set({ activeTool: null }),

  toggleReferencesPanel: () =>
    set((s) => ({ referencesPanelOpen: !s.referencesPanelOpen })),

  setPanMode: (panMode) => set({ panMode }),

  setLayoutBreakpoint: (layoutBreakpoint) => set({ layoutBreakpoint }),

  addJob: (job) =>
    set((s) => {
      const newJobs = [...s.jobs, job];
      persistJobs(newJobs);
      return { jobs: newJobs };
    }),

  updateJob: (id, patch) =>
    set((s) => {
      const newJobs = s.jobs.map((j) =>
        j.id === id ? { ...j, ...patch } : j
      );
      persistJobs(newJobs);
      return { jobs: newJobs };
    }),

  removeJob: (id) =>
    set((s) => {
      const newJobs = s.jobs.filter((j) => j.id !== id);
      persistJobs(newJobs);
      return { jobs: newJobs };
    }),

  setEffectsPreviewStack: (effectsPreviewStack) => set({ effectsPreviewStack }),

  resetEffectsPreview: () => set({ effectsPreviewStack: [] }),

  hydrateJobsFromSession: () => {
    const persisted = loadPersistedJobs();
    if (persisted.length > 0) {
      set({ jobs: persisted });
    }
    return persisted;
  },

  clearPersistedJobs: () => {
    try {
      sessionStorage.removeItem(TAB_JOBS_KEY);
    } catch {
      // Ignore
    }
  },

  showConfirmDialog: (config) =>
    set({
      confirmDialog: {
        open: true,
        title: config.title,
        body: config.body,
        confirmLabel: config.confirmLabel,
        cancelLabel: config.cancelLabel,
        destructive: config.destructive,
        onConfirm: config.onConfirm,
      },
    }),

  closeConfirmDialog: () =>
    set((s) => ({
      confirmDialog: { ...s.confirmDialog, open: false, onConfirm: null },
    })),

  incrementTabBadge: (canvasId) =>
    set((s) => ({
      tabBadges: {
        ...s.tabBadges,
        [canvasId]: (s.tabBadges[canvasId] || 0) + 1,
      },
    })),

  clearTabBadge: (canvasId) =>
    set((s) => {
      const next = { ...s.tabBadges };
      delete next[canvasId];
      return { tabBadges: next };
    }),
  toggleToolRailExpanded: () =>
    set((s) => {
      const next = !s.toolRailExpanded;
      saveBool(TOOL_RAIL_EXPANDED_KEY, next);
      return { toolRailExpanded: next };
    }),

  toggleShowGrid: () =>
    set((s) => {
      const next = !s.showGrid;
      saveBool(SHOW_GRID_KEY, next);
      return { showGrid: next };
    }),
}));

export const getInspectorOpen = (state: WorkspaceState) =>
  state.activeTool !== null;
