# ArtDirector Studio — ARCHITECTURE CANON

This document is the single source of truth for architecture, data flow, UI invariants, and system constraints.

**If any implementation contradicts this document, this document wins.**

**No feature may be built that violates these rules.**

---

## 1. Core Product Philosophy

- ArtDirector Studio is a **single infinite board** creative engine.
- It is **not** a multi-page tool suite.
- The board **never** disappears.
- Selection **drives** everything.
- Versions are **not** board placement.
- Credits are **tamper-proof**.
- Responsive is **first-class**, not an afterthought.

---

## 2. Non-Negotiable Invariants

- The board is **always** visible.
- Tools are Inspector drawers, **never** full-page replacements.
- Selection **drives** all tool actions.
- Every AI action requires a **valid credit reservation**.
- Replace **always** creates a new version.
- Versions are **independent** from board placement.
- Effects preview is **instant** where possible, **deterministic** on commit.
- Fun Lab always generates **exactly 3** options.
- Responsive layouts are **defined** from Phase 1.
- **No hardcoded UI strings.** All copy lives in `microcopy.ts`.

---

## 3. System Separation

### 3.1 Board vs Versioning

- Board items represent **placement**.
- Versions represent **creative history**.
- They must **never** be the same thing.

---

## 4. Canonical Data Model

### 4.1 image_versions (Creative History Layer)

```
image_versions
--------------
id (uuid)
root_image_id (uuid)
parent_version_id (uuid | null)
storage_url (text)
metadata (jsonb)
created_by (uuid)
created_at (timestamp)
```

**Rules:**

- `root_image_id` is constant across creative lineage.
- `parent_version_id` enables branching.
- Every regenerate, effects commit, or fun lab commit creates a new `image_version`.
- Versions can exist **without** being on the board.

### 4.2 canvas_items (Board Placement Layer)

```
canvas_items
------------
id
type ('image' | 'reference' | 'note' | 'comparison')
image_version_id (uuid | null)
root_image_id (uuid | null)
position_x
position_y
...
```

**Rules:**

- `canvas_items` **reference** image_versions.
- `canvas_items` do **NOT** store lineage.
- Deleting a board item does **not** delete versions.
- Multiple `canvas_items` can reference different versions of same `root_image_id`.

---

## 5. Replace vs Add Semantics

### Replace

1. Create new `image_version`.
2. Update `canvas_item.image_version_id`.
3. Board item remains in place.
4. Version strip reflects new version.
5. **Replace never overwrites history.**

### Add

1. Create new `image_version`.
2. Create new `canvas_item` referencing it.
3. Offset placement.
4. Both items visible.

---

## 6. Version Strip Rules

Derived from:

```sql
SELECT * FROM image_versions
WHERE root_image_id = current.root_image_id
ORDER BY created_at ASC
```

**Rules:**

- Never stored separately.
- Always derived.
- Clicking version updates board item reference.
- Dragging two versions creates `ComparisonItem`.

---

## 7. Async Job Model

Every AI action creates a job.

```
AsyncJob {
  id
  tab_id
  root_image_id
  source_version_id
  reservation_id
  action
  expected_outputs
  status
}
```

**Rules:**

- Output attaches to `source_version_id`.
- **Never** attaches to current selection.
- Jobs survive selection changes.
- Refund only on failure, cancel, or expiry.
- **Never** auto-refund on component unmount.

---

## 8. Credits System (Tamper-Proof)

### 8.1 Reservation Flow

1. Client calls `reserve-credits`.
2. Server creates pending `credit_transaction`.
3. Client calls AI endpoint with `reservation_id`.
4. Server validates `reservation_id`:
   - Must exist
   - Must belong to user
   - Must be pending
   - Must not be expired
5. On success → commit.
6. On failure → refund.

**AI endpoints must reject requests without valid `reservation_id`.**

### 8.2 credit_transactions

```
id
user_id
amount
status ('pending' | 'completed' | 'reversed')
expires_at
committed_at
description
```

`reservation_id` **IS** `credit_transactions.id`.

No secondary reservation column.

---

## 9. Effects System

Two lanes only.

### Lane A — Instant

- Preview: CSS/WebGL
- Commit: deterministic canvas pipeline render
- Cost: **Free**
- **Never** screenshot CSS.

### Lane B — Server

- Preview: approximation or preview badge
- Commit: server processing
- Cost: **Paid**
- Reservation required.

### Effects Stack Model

```
EffectLayer {
  id
  type
  lane
  enabled
  order
  params
}
```

- Preview stack lives in transient workspace state.
- Committed stack stored in `image_versions.metadata.effects_stack`.
- Switching versions resets preview stack to committed state.

---

## 10. Fun Lab

Fun Lab is a **drawer**, not a page.

**Rules:**

- Always generate **exactly 3** outputs.
- Tiles appear near selected image.
- Selecting one commits version.
- Others collapse after 20 seconds.
- Reservation required before generation.

---

## 11. Store Responsibilities

### canvasStore (existing)

**Owns:**

- Board items
- Selection
- Viewport
- Undo/redo
- Sync

**Does NOT own:**

- Active tool
- Drawer state
- Jobs
- Layout breakpoint

### workspaceStore (new)

**Owns:**

- activeTool
- inspectorOpen
- referencesPanelOpen
- layoutBreakpoint
- jobs[]
- transient effects preview stack

**Does NOT own:**

- Board items
- Selection
- Viewport

**No additional stores** for selection or versions.

---

## 12. Responsive Contract

**Breakpoints:**

- Mobile <768
- Tablet 768–1024
- Desktop Narrow 1024–1280
- Desktop Wide >1280

**Rules:**

- Primary action always visible.
- Desktop: right Inspector.
- Tablet: right sheet.
- Mobile: bottom sheet with snap points.
- References is **one** component rendered differently per breakpoint.
- Two-finger pan always.
- One-finger drag only for selected item.
- Keyboard shortcuts disabled inside input focus.

---

## 13. Microcopy Rules

- All strings must live in:
  - `src/lib/microcopy.ts`
- **No hardcoded UI text.**
- Toasts must always clarify:
  - What happened
  - If credits were refunded
- Never mention internal terms like `reservation_id`.

---

## 14. Performance Guardrails

- Only selected item re-renders during preview.
- Effects preview throttled to animation frame.
- No blocking loaders.
- Async status pills attach to items.
- No layout shift on drawer open.

---

## 15. Branching Support

- `image_versions.parent_version_id` supports branching.
- UI tree view not required now.
- Architecture must support it.

---

## 16. Forbidden Patterns

- No new tool pages.
- No duplicating selection state.
- No storing lineage on `canvas_items`.
- No mutating versions in place.
- No client-side credit deduction without server validation.
- No screenshotting CSS for commits.
- No dead modal logic once drawers replace them.

---

## 17. Development Discipline

Each phase must:

1. Respect this document.
2. Not modify unrelated systems.
3. Provide manual test steps.
4. Avoid expanding context beyond scope.
5. Reset agent if context >75%.

---

## 18. Canon Enforcement Rule

Before implementing any phase:

**The agent must state:**

1. Which invariant applies
2. Which tables are affected
3. Which store owns the change
4. Whether credit reservation is involved

**If it cannot state those clearly, it must not implement.**

---

## End of Canon

This document prevents drift.

It keeps:

- Versioning clean
- Credits safe
- Effects deterministic
- UI unified
- Board sacred

---

**Use this at the start of every new Cursor session:**

> "Read ARCHITECTURE_CANON.md. Confirm invariants. We are implementing Phase X only."
