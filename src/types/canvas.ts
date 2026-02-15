// Project
export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  thumbnail_url?: string | null;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  deleted_at?: string | null;
}

// Canvas
export interface Canvas {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  order: number;
  zoom_level: number;
  pan_x: number;
  pan_y: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  deleted_at?: string | null;
}

// Canvas Item types
export type CanvasItemType = 'image' | 'reference' | 'note' | 'comparison';

export interface EffectLayer {
  id: string;
  type: string;
  lane: 'instant' | 'server';
  enabled: boolean;
  order: number;
  params: Record<string, number | string | boolean>;
}

export interface ImageItemData {
  url: string;
  originalUrl?: string;
  thumbnailUrl?: string;
  uploading?: boolean;
  fileName?: string;
  fileSize?: number;
  naturalWidth?: number;
  naturalHeight?: number;
  locked_description?: string;
  editable_direction?: string;
  analysis_data?: Record<string, unknown>;
  effects_stack?: EffectLayer[];
}

export interface ReferenceItemData {
  url: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  label?: string;
}

export interface NoteItemData {
  text: string;
  color?: string;
}

export interface ComparisonItemData {
  leftImageUrl: string;
  rightImageUrl: string;
  label?: string;
}

export type CanvasItemData = ImageItemData | ReferenceItemData | NoteItemData | ComparisonItemData;

export interface CanvasItem {
  id: string;
  canvas_id: string;
  user_id: string;
  type: CanvasItemType;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;
  data: CanvasItemData;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  image_version_id?: string | null;
  root_image_id?: string | null;
}

// Canvas Action (undo/redo)
export type CanvasActionType = 'create' | 'update' | 'delete' | 'move' | 'resize' | 'rotate';

export interface CanvasAction {
  id: string;
  canvas_id: string;
  user_id: string;
  action_type: CanvasActionType;
  item_id?: string | null;
  before_state: Record<string, any> | null;
  after_state: Record<string, any> | null;
  timestamp: string;
  seq?: number;
}

// Store state
export interface CanvasState {
  // Project/canvas
  currentProjectId: string | null;
  currentCanvasId: string | null;
  projects: Project[];
  canvases: Canvas[];

  // Items
  items: CanvasItem[];
  selectedItemIds: Set<string>;

  // Viewport
  zoom: number;
  panX: number;
  panY: number;

  // History
  undoStack: CanvasAction[];
  redoStack: CanvasAction[];

  // Sync
  isDirty: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;

  // UI
  isLoading: boolean;
  error: string | null;
}

// Point helper
export interface Point {
  x: number;
  y: number;
}

// Bounds helper
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
