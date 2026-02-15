# Undo/Redo Integrity Matrix

## Rules
- Every operation that changes board state (canvasStore.items) must be undoable.
- Pile fan-out is UI-only state (React `useState`), not persisted, not undoable. Correct.
- Undo/redo operates on `canvasStore.undoStack` / `redoStack` via `recordAction()`.

## Matrix

| Action | State changed | Undo behavior | Redo behavior | Status |
|--------|--------------|---------------|---------------|--------|
| Import image | `addItem` → records `create` | Restores `deleted_at` on item | Re-creates item | ✅ via `recordAction('create')` |
| Delete item | `deleteItem` → sets `deleted_at` | Clears `deleted_at` | Re-sets `deleted_at` | ✅ via `recordAction('delete')` |
| Move item | `moveItem` → records old/new position | Restores old position | Restores new position | ✅ via `recordAction('move')` |
| Resize item | `resizeItem` → records old/new size | Restores old size | Restores new size | ✅ via `recordAction('resize')` |
| Duplicate item | `duplicateItem` → calls `addItem` | Restores `deleted_at` on duplicate | Re-creates duplicate | ✅ via `addItem → recordAction('create')` |
| Switch version | `updateItemVersion` → records old/new `image_version_id` + `data` | Restores old version URL + ID | Restores new version URL + ID | ✅ via `recordAction('update')` |
| Commit effects (replace) | `updateItemVersion` | Restores pre-effects version | Restores post-effects version | ✅ |
| Commit effects (add) | `addItem` new item | Restores `deleted_at` on new item | Re-creates | ✅ |
| Commit funlab tile (replace) | `updateItemVersion` | Restores pre-funlab version | Restores post-funlab version | ✅ |
| Commit funlab tile (add) | `addItem` new item | Restores `deleted_at` on new item | Re-creates | ✅ |
| Regenerate (replace) | `updateItemVersion` | Restores pre-regen version | Restores post-regen version | ✅ |
| Regenerate (add) | `addItem` new item | Restores `deleted_at` on new item | Re-creates | ✅ |
| Analyze | `updateItem` → records old/new `data` | Restores data without analysis | Restores data with analysis | ✅ via `recordAction('update')` |
| Select/deselect | `selectedItemIds` only | **Not undoable** — selection is not board state | N/A | ✅ Correct |
| Zoom/pan | `zoom`, `panX`, `panY` | **Not undoable** — viewport is not board state | N/A | ✅ Correct |
| Pile fan-out | React `useState` in `Pile` component | **Not undoable** — UI-only, not persisted | N/A | ✅ Correct |
| Effects preview | `workspaceStore.effectsPreviewStack` | **Not undoable** — transient state in workspaceStore | N/A | ✅ Correct |
| Job status changes | `workspaceStore.jobs` | **Not undoable** — workspaceStore, not board state | N/A | ✅ Correct |

## Known gaps

| Gap | Risk | Mitigation |
|-----|------|------------|
| `updateItem` for analysis stores entire `data` blob in undo stack | Large undo entries for items with big analysis_data | Acceptable — undo stack is capped at 50 entries |
| `deleteSelectedItems` calls `deleteItem` N times, creating N undo entries | Multi-delete requires N undos | Could batch into single action in future |
