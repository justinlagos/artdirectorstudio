# Architecture Decision: Versioning Model

## Decision

**`image_versions` is the single canonical lineage model.**

There is no `canvas_items.parent_id` or `canvas_items.version_number`. Those were never implemented and are not part of the canon.

## How it works

| Layer | Table | Purpose |
|-------|-------|---------|
| Creative history | `image_versions` | Stores every version of an image. Has `root_image_id` (lineage key), `parent_version_id` (branching), `storage_url`, `metadata`, `source_action`. |
| Board placement | `canvas_items` | Stores position, size, z-index. References `image_version_id` (FK) and `root_image_id` (grouping key). |

### Key rules (from ARCHITECTURE_CANON §3.1, §4.1, §4.2)

1. **Board items represent placement. Versions represent creative history. They are never the same thing.**
2. `canvas_items` does NOT store lineage. It has `image_version_id` (pointer to current version) and `root_image_id` (grouping key for stacking).
3. Deleting a board item does NOT delete versions.
4. Multiple `canvas_items` can reference different versions of the same `root_image_id`.
5. Version strip derives from `SELECT * FROM image_versions WHERE root_image_id = ? ORDER BY created_at ASC`. Never stored separately.
6. Smart stacking groups `canvas_items` by `root_image_id` — this is a board-level visual grouping, not lineage.

## What was considered and rejected

- **canvas_items.parent_id chain**: Would conflate placement with history. Canon §16 explicitly forbids "storing lineage on canvas_items."
- **Hybrid model**: No. One source of truth for lineage.

## Implementation audit

| Component | Uses `image_versions`? | Uses `root_image_id` on `canvas_items`? | Correct? |
|-----------|----------------------|----------------------------------------|----------|
| `useImageVersions.ts` | Yes — fetches/creates from `image_versions` | N/A | ✅ |
| `VersionsStrip.tsx` | Yes — queries via `useImageVersions(rootImageId)` | Reads `selectedItem.root_image_id` | ✅ |
| `CanvasItems.tsx` (stacking) | No — stacking is board-level | Groups by `item.root_image_id` | ✅ |
| `canvasStore.updateItemVersion` | Updates `canvas_items.image_version_id` | N/A | ✅ |
| `AnalyzeDrawer`, `RegenerateDrawer`, `EffectsDrawer`, `FunLabDrawer` | All call `createVersion()` | N/A | ✅ |

## Conclusion

No hybrid exists. No reconciliation needed. The implementation matches ARCHITECTURE_CANON exactly.
