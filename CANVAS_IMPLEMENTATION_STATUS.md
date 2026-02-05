# Canvas Workspace Implementation Status

## Overview
This document tracks the implementation of the Canvas-first, AI-native design workspace as specified in the implementation spec.

## Completed Components

### 1. Database Schema ✅
- **File**: `supabase/migrations/20260123_canvas_documents.sql`
- **Status**: Complete
- **Tables Created**:
  - `documents` - Single source of truth for canvas state
  - `assets` - Image/mask/vector assets
  - `actions` - Immutable action log
  - `user_preferences` - Extended with active_document_id and last_view_mode
- **Features**: RLS policies, indexes, triggers

### 2. TypeScript Types ✅
- **File**: `src/types/workspace.ts`
- **Status**: Complete
- **Includes**: DocumentRecord, LayerGraph, LayerNode types, all prop interfaces for WorkspaceShell components

### 3. Action Engine ✅
- **File**: `src/lib/actions/actionEngine.ts`
- **Status**: Complete
- **Features**: Pure reducers for apply/revert, validation

### 4. API Endpoints ✅
- **Documents API**: `supabase/functions/documents/index.ts`
  - POST /api/v1/documents - Create
  - GET /api/v1/documents/{id} - Get with ETag
  - PATCH /api/v1/documents/{id} - Update metadata
  - GET /api/v1/documents - List
  
- **Actions API**: `supabase/functions/actions/index.ts`
  - POST /api/v1/documents/{id}/actions - Batch apply
  - POST /api/v1/documents/{id}/undo - Undo
  - POST /api/v1/documents/{id}/redo - Redo
  - GET /api/v1/documents/{id}/actions - List
  
- **Assets API**: `supabase/functions/assets/index.ts`
  - POST /api/v1/assets/upload-url - Get presigned URL
  - POST /api/v1/assets/finalize - Finalize upload
  - GET /api/v1/assets/{id} - Get asset
  - GET /api/v1/documents/{id}/assets - List document assets

### 5. UI Components ✅ (Basic Structure)
- **WorkspaceShell**: `src/components/workspace/WorkspaceShell.tsx`
- **TopToolbar**: `src/components/workspace/TopToolbar.tsx`
- **LeftPanel**: `src/components/workspace/LeftPanel.tsx`
- **CanvasStage**: `src/components/workspace/CanvasStage.tsx`
- **RightInspector**: `src/components/workspace/RightInspector.tsx`
- **BottomTray**: `src/components/workspace/BottomTray.tsx`
- **GeneratePanel**: `src/components/workspace/GeneratePanel.tsx`
- **AssetsPanel**: `src/components/workspace/AssetsPanel.tsx`
- **LayersPanel**: `src/components/workspace/LayersPanel.tsx`

### 6. State Management ✅ (Basic)
- **DocumentStore**: `src/store/documentStore.ts`
- **Tool State Machine**: `src/hooks/useToolStateMachine.tsx`

## In Progress / Needs Work

### 1. DocumentStore API Integration
- **Issue**: API calls need proper URL construction for Supabase Edge Functions
- **Fix Needed**: Use correct function invocation pattern or direct fetch with proper URLs

### 2. Canvas Renderer
- **Status**: Basic structure exists, needs full implementation
- **Needed**:
  - Asset loading and caching
  - Layer rendering pipeline (raster, text, vector)
  - Blend modes
  - Masks
  - Effects (shadow, blur)
  - Hit testing
  - Snapping

### 3. GeneratePanel Implementation
- **Status**: Placeholder only
- **Needed**: Full generation form with model selection, size, prompt, etc.
- **Integration**: Connect to existing generate-image edge function, but write to document via actions

### 4. Preview Overlay Batching
- **Status**: Hook exists, needs integration
- **Needed**: 
  - Gesture tracking (pointerdown/move/up)
  - Preview updates during drags
  - Single commit on gesture end
  - Conflict handling

### 5. Mobile Adaptations
- **Status**: Basic drawer structure exists
- **Needed**: 
  - Proper sheet/drawer components
  - Touch gesture handling
  - Bottom bar navigation
  - Canvas interaction when drawers open

### 6. Classic Generation Integration
- **Status**: Not started
- **Needed**: 
  - Modify existing ImageGenerationDialog to write assets + addLayer actions
  - Remove transient results state
  - Ensure results go directly into document

### 7. Edit Modals Replacement
- **Status**: Not started
- **Needed**: 
  - Replace ImageGenerationDialog modal with GeneratePanel
  - Replace edit modals with panels
  - Ensure canvas always visible

## Known Issues

1. **API URL Construction**: DocumentStore uses Deno.env which won't work in browser. Need to use Supabase client properly or construct URLs from environment.

2. **Action Engine**: Simplified implementation in API endpoints. Should use shared action engine module.

3. **Asset Loading**: Canvas renderer needs proper asset loading from storage URLs.

4. **Version Mismatch Handling**: Client needs to handle VERSION_MISMATCH errors gracefully with refetch and retry.

## Next Steps (Priority Order)

1. **Fix DocumentStore API calls** - Use proper Supabase client or fetch with correct URLs
2. **Implement full GeneratePanel** - Connect to generation, write to document
3. **Complete Canvas renderer** - Asset loading, layer rendering, overlays
4. **Add preview overlay batching** - Gesture tracking, preview updates, commits
5. **Replace modals** - Convert ImageGenerationDialog and edit modals to panels
6. **Mobile polish** - Proper drawers, touch handling
7. **Classic integration** - Update existing generation to use document model

## File-by-File Summary

### New Files Created
- `supabase/migrations/20260123_canvas_documents.sql` - Database schema
- `src/types/workspace.ts` - All type definitions
- `src/lib/actions/actionEngine.ts` - Action reducers
- `supabase/functions/documents/index.ts` - Documents API
- `supabase/functions/actions/index.ts` - Actions API
- `supabase/functions/assets/index.ts` - Assets API
- `src/components/workspace/WorkspaceShell.tsx` - Main workspace
- `src/components/workspace/TopToolbar.tsx` - Top toolbar
- `src/components/workspace/LeftPanel.tsx` - Left panel container
- `src/components/workspace/CanvasStage.tsx` - Canvas renderer
- `src/components/workspace/RightInspector.tsx` - Right inspector
- `src/components/workspace/BottomTray.tsx` - Bottom tray
- `src/components/workspace/GeneratePanel.tsx` - Generate panel (placeholder)
- `src/components/workspace/AssetsPanel.tsx` - Assets panel
- `src/components/workspace/LayersPanel.tsx` - Layers panel
- `src/store/documentStore.ts` - Document state management
- `src/hooks/useToolStateMachine.tsx` - Tool state machine

### Files to Modify (Not Yet Done)
- `src/components/ImageGenerationDialog.tsx` - Replace modal with panel integration
- `src/components/edit-image/EditImageModal.tsx` - Replace with panel
- `src/pages/Index.tsx` - Integrate WorkspaceShell for canvas mode
- Generation edge functions - Update to write to documents via actions

## Testing Checklist

- [ ] Create document via API
- [ ] Load document and render on canvas
- [ ] Generate image and add as layer
- [ ] Undo/redo actions
- [ ] Switch Classic <-> Canvas without content change
- [ ] Mobile: Open panels as drawers
- [ ] Version mismatch handling
- [ ] Preview overlay during drags
- [ ] Asset upload and finalization

## Limitations (v1)

1. Group layers not implemented (placeholder only)
2. Vector layer rendering simplified
3. Text layer editing basic
4. No realtime sync (WebSocket optional per spec)
5. Export/render endpoints not implemented
6. AI edit operations not integrated
7. Brush/mask tools not implemented
