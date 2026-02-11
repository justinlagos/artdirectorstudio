import { useSyncExternalStore } from 'react';
import {
  CanvasState,
  Project,
  Canvas,
  CanvasItem,
  CanvasAction,
  CanvasActionType,
} from '../types/canvas';

// Initialize state
const initialState: CanvasState = {
  currentProjectId: null,
  currentCanvasId: null,
  projects: [],
  canvases: [],
  items: [],
  selectedItemIds: new Set<string>(),
  zoom: 1,
  panX: 0,
  panY: 0,
  undoStack: [],
  redoStack: [],
  isDirty: false,
  isSyncing: false,
  lastSyncedAt: null,
  isLoading: false,
  error: null,
};

let state = { ...initialState };
const listeners = new Set<() => void>();

// Core store functions
const notify = () => {
  listeners.forEach((listener) => listener());
};

const setState = (partialState: Partial<CanvasState>) => {
  state = { ...state, ...partialState };
  notify();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// Selector hook
const useStore = <T,>(selector: (state: CanvasState) => T): T => {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state)
  );
};

// Helper to create a unique ID
const generateId = (): string => {
  return crypto.randomUUID();
};

// Helper to record an action for undo/redo
const recordAction = (
  actionType: CanvasActionType,
  itemId: string | null,
  beforeState: Record<string, any> | null,
  afterState: Record<string, any> | null
): void => {
  if (!state.currentCanvasId) return;

  const action: CanvasAction = {
    id: generateId(),
    canvas_id: state.currentCanvasId,
    user_id: '', // Will be set by the application
    action_type: actionType,
    item_id: itemId,
    before_state: beforeState,
    after_state: afterState,
    timestamp: new Date().toISOString(),
  };

  const newUndoStack = [...state.undoStack, action];
  const trimmedUndoStack = newUndoStack.slice(-50); // Keep last 50 actions

  setState({
    undoStack: trimmedUndoStack,
    redoStack: [], // Clear redo stack when new action is performed
  });
};

// Store API object
const store = {
  // Accessors
  getState: (): CanvasState => state,

  // Project management
  setProjects: (projects: Project[]): void => {
    setState({ projects });
  },

  setCurrentProject: (projectId: string): void => {
    setState({ currentProjectId: projectId });
  },

  // Canvas management
  setCanvases: (canvases: Canvas[]): void => {
    setState({ canvases });
  },

  setCurrentCanvas: (canvasId: string): void => {
    setState({ currentCanvasId: canvasId });
  },

  addCanvas: (canvas: Canvas): void => {
    const newCanvases = [...state.canvases, canvas];
    setState({ canvases: newCanvases });
  },

  removeCanvas: (canvasId: string): void => {
    const newCanvases = state.canvases.filter((c) => c.id !== canvasId);
    setState({ canvases: newCanvases });
  },

  updateCanvasViewport: (zoom: number, panX: number, panY: number): void => {
    setState({ zoom, panX, panY });
  },

  // Item operations
  addItem: (item: CanvasItem): void => {
    const newItems = [...state.items, item];
    setState({ items: newItems });
    recordAction('create', item.id, null, {
      type: item.type,
      position_x: item.position_x,
      position_y: item.position_y,
      width: item.width,
      height: item.height,
      rotation: item.rotation,
      z_index: item.z_index,
      data: item.data,
    });
    store.markDirty();
  },

  updateItem: (itemId: string, updates: Partial<CanvasItem>): void => {
    const itemIndex = state.items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) return;

    const oldItem = state.items[itemIndex];
    const newItem = { ...oldItem, ...updates };
    const newItems = [...state.items];
    newItems[itemIndex] = newItem;

    const beforeState = {
      type: oldItem.type,
      position_x: oldItem.position_x,
      position_y: oldItem.position_y,
      width: oldItem.width,
      height: oldItem.height,
      rotation: oldItem.rotation,
      z_index: oldItem.z_index,
      data: oldItem.data,
    };

    const afterState = {
      type: newItem.type,
      position_x: newItem.position_x,
      position_y: newItem.position_y,
      width: newItem.width,
      height: newItem.height,
      rotation: newItem.rotation,
      z_index: newItem.z_index,
      data: newItem.data,
    };

    setState({ items: newItems });
    recordAction('update', itemId, beforeState, afterState);
    store.markDirty();
  },

  moveItem: (itemId: string, x: number, y: number): void => {
    const itemIndex = state.items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) return;

    const oldItem = state.items[itemIndex];
    const newItem = { ...oldItem, position_x: x, position_y: y };
    const newItems = [...state.items];
    newItems[itemIndex] = newItem;

    setState({ items: newItems });
    recordAction(
      'move',
      itemId,
      { position_x: oldItem.position_x, position_y: oldItem.position_y },
      { position_x: x, position_y: y }
    );
    store.markDirty();
  },

  resizeItem: (itemId: string, width: number, height: number): void => {
    const itemIndex = state.items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) return;

    const oldItem = state.items[itemIndex];
    const newItem = { ...oldItem, width, height };
    const newItems = [...state.items];
    newItems[itemIndex] = newItem;

    setState({ items: newItems });
    recordAction(
      'resize',
      itemId,
      { width: oldItem.width, height: oldItem.height },
      { width, height }
    );
    store.markDirty();
  },

  deleteItem: (itemId: string): void => {
    const itemIndex = state.items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) return;

    const oldItem = state.items[itemIndex];
    const newItem = { ...oldItem, deleted_at: new Date().toISOString() };
    const newItems = [...state.items];
    newItems[itemIndex] = newItem;

    const newSelectedItemIds = new Set(state.selectedItemIds);
    newSelectedItemIds.delete(itemId);

    setState({ items: newItems, selectedItemIds: newSelectedItemIds });
    recordAction('delete', itemId, { deleted_at: oldItem.deleted_at }, { deleted_at: newItem.deleted_at });
    store.markDirty();
  },

  deleteSelectedItems: (): void => {
    state.selectedItemIds.forEach((itemId) => {
      store.deleteItem(itemId);
    });
  },

  duplicateItem: (itemId: string): CanvasItem => {
    const item = state.items.find((i) => i.id === itemId);
    if (!item) throw new Error(`Item ${itemId} not found`);

    const newItem: CanvasItem = {
      ...item,
      id: generateId(),
      position_x: item.position_x + 20,
      position_y: item.position_y + 20,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    store.addItem(newItem);
    return newItem;
  },

  duplicateSelectedItems: (): void => {
    const selectedIds = Array.from(state.selectedItemIds);
    const newIds = new Set<string>();
    selectedIds.forEach((itemId) => {
      const newItem = store.duplicateItem(itemId);
      newIds.add(newItem.id);
    });
    setState({ selectedItemIds: newIds });
  },

  // Selection
  selectItem: (itemId: string, addToSelection = false): void => {
    const newSelectedItemIds = addToSelection ? new Set(state.selectedItemIds) : new Set<string>();
    newSelectedItemIds.add(itemId);
    setState({ selectedItemIds: newSelectedItemIds });
  },

  deselectItem: (itemId: string): void => {
    const newSelectedItemIds = new Set(state.selectedItemIds);
    newSelectedItemIds.delete(itemId);
    setState({ selectedItemIds: newSelectedItemIds });
  },

  clearSelection: (): void => {
    setState({ selectedItemIds: new Set<string>() });
  },

  selectAll: (): void => {
    const allItemIds = new Set(
      state.items
        .filter((item) => !item.deleted_at)
        .map((item) => item.id)
    );
    setState({ selectedItemIds: allItemIds });
  },

  // Viewport
  setZoom: (zoom: number): void => {
    setState({ zoom });
  },

  setPan: (x: number, y: number): void => {
    setState({ panX: x, panY: y });
  },

  // History
  undo: (): void => {
    if (state.undoStack.length === 0) return;

    const lastAction = state.undoStack[state.undoStack.length - 1];
    const newUndoStack = state.undoStack.slice(0, -1);
    const newRedoStack = [...state.redoStack, lastAction];

    // Apply before_state
    if (lastAction.item_id && lastAction.before_state) {
      const itemIndex = state.items.findIndex((i) => i.id === lastAction.item_id);
      if (itemIndex !== -1) {
        const oldItem = state.items[itemIndex];
        const restoredItem = { ...oldItem, ...lastAction.before_state };
        const newItems = [...state.items];
        newItems[itemIndex] = restoredItem;
        setState({ items: newItems, undoStack: newUndoStack, redoStack: newRedoStack });
      }
    } else {
      setState({ undoStack: newUndoStack, redoStack: newRedoStack });
    }
  },

  redo: (): void => {
    if (state.redoStack.length === 0) return;

    const lastAction = state.redoStack[state.redoStack.length - 1];
    const newRedoStack = state.redoStack.slice(0, -1);
    const newUndoStack = [...state.undoStack, lastAction];

    // Apply after_state
    if (lastAction.item_id && lastAction.after_state) {
      const itemIndex = state.items.findIndex((i) => i.id === lastAction.item_id);
      if (itemIndex !== -1) {
        const oldItem = state.items[itemIndex];
        const restoredItem = { ...oldItem, ...lastAction.after_state };
        const newItems = [...state.items];
        newItems[itemIndex] = restoredItem;
        setState({ items: newItems, undoStack: newUndoStack, redoStack: newRedoStack });
      }
    } else {
      setState({ undoStack: newUndoStack, redoStack: newRedoStack });
    }
  },

  // Sync helpers
  markDirty: (): void => {
    setState({ isDirty: true });
  },

  markClean: (): void => {
    setState({ isDirty: false });
  },

  setSyncing: (syncing: boolean): void => {
    setState({ isSyncing: syncing });
  },

  setLastSynced: (timestamp: string): void => {
    setState({ lastSyncedAt: timestamp });
  },

  // Loading/error
  setLoading: (loading: boolean): void => {
    setState({ isLoading: loading });
  },

  setError: (error: string | null): void => {
    setState({ error });
  },

  // Hydration
  hydrate: (data: {
    projects: Project[];
    canvases: Canvas[];
    items: CanvasItem[];
    currentProjectId?: string;
    currentCanvasId?: string;
  }): void => {
    setState({
      projects: data.projects,
      canvases: data.canvases,
      items: data.items,
      currentProjectId: data.currentProjectId || null,
      currentCanvasId: data.currentCanvasId || null,
      isDirty: false,
      undoStack: [],
      redoStack: [],
    });
  },

  subscribe,
};

// Attach static methods to the hook
type UseCanvasStore = typeof useStore & typeof store;

const useCanvasStore = useStore as UseCanvasStore;

// Attach all store methods as static methods
Object.keys(store).forEach((key) => {
  if (key !== 'subscribe' && key !== 'getState') {
    (useCanvasStore as any)[key] = (store as any)[key];
  }
});

// Attach subscribe and getState
(useCanvasStore as any).subscribe = store.subscribe;
(useCanvasStore as any).getState = store.getState;

export { useCanvasStore };
