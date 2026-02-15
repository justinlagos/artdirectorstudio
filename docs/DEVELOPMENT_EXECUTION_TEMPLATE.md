# ArtDirector Studio — DEVELOPMENT_EXECUTION_TEMPLATE.md

**Nothing gets implemented without following this format.**

- No free-form building.
- No wandering.
- No assumptions.

Every development session must follow this structure.

---

## 0. Pre-Flight Protocol (Mandatory)

Before writing code, the agent must:

- [ ] Confirm it has read `ARCHITECTURE_CANON.md`.
- [ ] State which invariants apply.
- [ ] State which store owns the change.
- [ ] State which database tables are affected.
- [ ] State whether credit reservation is involved.
- [ ] State whether versions are involved.
- [ ] State whether async jobs are involved.
- [ ] Confirm responsive behavior impact.
- [ ] Confirm which breakpoints must be tested.
- [ ] Confirm scope boundary (what is **NOT** being touched).

**If any of these are unclear, the agent must stop and ask.**

---

## 1. Task Definition Block

Every task must begin with:

```
TASK NAME:
PHASE:
SCOPE TYPE: (UI | Data | Effects | Fun Lab | Credits | Async | Routing | Store | Performance)
BREAKPOINT IMPACT: (None | Mobile | Tablet | Desktop | All)
CREDIT IMPACT: (None | Reserve Required | Commit Required | Refund Possible)
VERSION IMPACT: (None | Create New Version | Replace Flow | Derive Only)
ASYNC JOB: (Yes | No)
FILES EXPECTED TO CHANGE:
```

**No coding until this block is completed.**

---

## 2. Constraints Declaration

The agent must explicitly confirm:

- [ ] Board must remain visible.
- [ ] No modals unless explicitly allowed.
- [ ] No duplication of selection state.
- [ ] No mutation of `image_versions`.
- [ ] No direct credit deduction without reservation.
- [ ] All UI text imported from `microcopy.ts`.
- [ ] No new routes unless explicitly required.

**If any of these would be violated, implementation must stop.**

---

## 3. Data Model Confirmation

**If touching database:**

```
Tables affected:
New columns:
Indexes:
RLS changes:
Edge functions modified:
```

**If not touching DB, state:**

> No database schema changes.

**No ambiguity allowed.**

---

## 4. Store Ownership Declaration

Explicitly state:

- **canvasStore responsibilities:**
- **workspaceStore responsibilities:**
- **No other stores modified.**

If adding new state, justify why it belongs in that store.

**If justification fails, do not add state.**

---

## 5. UI Contract Definition

Define:

| Contract | Definition |
|----------|------------|
| Primary Action | |
| Secondary Actions | |
| Empty State | |
| Loading State | |
| Error State | |
| Success State | |
| Tooltip Behavior | |
| Keyboard Impact | |

**Every one must be defined before implementation.**

**No undefined UX behavior.**

---

## 6. Credit Flow Definition (If Applicable)

If **CREDIT IMPACT ≠ None**, define:

1. `reserve(amount, action)`
2. pass `reservation_id` to endpoint
3. commit on success
4. refund on failure
5. expiry behavior

Explicitly state:

- What happens if reservation expires.
- What toast appears.
- What happens to UI state.

---

## 7. Versioning Flow Definition (If Applicable)

If **VERSION IMPACT ≠ None**, define:

- Source version:
- New version parent:
- `root_image_id`:
- Board behavior:
- Version strip update:

Explicitly confirm:

- Replace still creates a new version.
- Add creates new `canvas_item`.
- No history mutation.

---

## 8. Async Job Contract (If Applicable)

If **ASYNC JOB = Yes**:

Define:

- Job creation moment:
- `reservation_id` attached:
- `source_version_id` pinned:
- `expected_outputs`:
- completion behavior:
- failure behavior:
- cancel behavior:
- reload recovery behavior:

**Must confirm:**

- Job output **never** attaches to current selection.
- Job attaches to `source_version_id`.

---

## 9. Responsive Definition

For each breakpoint define:

| Breakpoint | Behavior |
|------------|----------|
| **Desktop Wide** | |
| **Desktop Narrow** | |
| **Tablet** | |
| **Mobile** | |

Confirm:

- Primary action always visible.
- No layout shift on drawer open.
- Board always visible.

---

## 10. Performance Contract

Define:

- Re-render scope.
- Whether memoization required.
- Whether throttle required.
- Whether animation required.
- Whether expensive operation off main thread.
- If expensive, state mitigation.

---

## 11. Implementation Plan

Step-by-step list:

1.
2.
3.
...

**No leaps. No vague steps.**

**Each step must correspond to a file.**

---

## 12. Files to Create

List full paths.

---

## 13. Files to Modify

List full paths.

---

## 14. Manual Test Plan

List exact manual tests:

- **Functional**
- **Credit Integrity**
- **Version Integrity**
- **Async Integrity**
- **Responsive**
- **Edge Cases**

**No test plan = no merge.**

---

## 15. Regression Checklist

Must confirm:

- [ ] Selection still works.
- [ ] Undo/redo unaffected.
- [ ] Board panning unaffected.
- [ ] Existing tools still function.
- [ ] Credits cannot go negative.
- [ ] No console errors.
- [ ] No unhandled promise rejections.

---

## 16. Failure Handling Matrix

Define for this task:

| Scenario | Expected Result |
|----------|-----------------|
| Network fail | |
| Reservation expired | |
| Unauthorized | |
| User switches tab mid-job | |
| User deletes item mid-job | |
| Reload mid-job | |

**If undefined → implementation incomplete.**

---

## 17. Completion Gate

Before declaring complete, agent must state:

- Which invariants were exercised.
- Which files changed.
- That no unrelated system was modified.
- That context usage remains below 75%.

**If context >75%, session must reset.**

---

## 18. Context Control Rule (Critical)

If Cursor context >75%:

1. **Stop.**
2. **Commit** changes.
3. **Start new** session.
4. **Re-read** `ARCHITECTURE_CANON.md`.
5. **Paste** this template again.
6. **Continue** next subtask only.

**Never implement major systems in one session.**

---

## 19. Forbidden Shortcuts

- No "temporary" hacks.
- No skipping reservation validation.
- No silent credit deduction.
- No direct DOM manipulation.
- No mutating version history.
- No bypassing stores.
- No adding global state outside approved stores.
- No UI text hardcoded.
- No modifying 5+ subsystems in one task.

---

## 20. Task Size Rule

A task must touch:

- At most **1** store
- At most **2** database tables
- At most **1** async endpoint
- At most **1** drawer
- At most **1** core domain concern

**If more than that, split the task.**

---

## 21. Review Self-Check

Before final output, agent must verify:

- [ ] Is this consistent with `ARCHITECTURE_CANON`?
- [ ] Did I accidentally merge board and version logic?
- [ ] Did I accidentally deduct credits client-side?
- [ ] Did I attach async output to selection instead of source?
- [ ] Did I break responsive contract?
- [ ] Did I introduce hidden coupling?

**If yes to any → refactor before finalizing.**

---

## 22. Output Format Requirement

All implementation responses must include:

1. Task Definition Block
2. Constraints Declaration
3. Data Model Confirmation
4. Store Ownership Declaration
5. UI Contract
6. Implementation Plan
7. Files
8. Manual Test Plan
9. Regression Checklist

**No prose outside structure.**

---

## 23. The Discipline Rule

If the agent ever responds with:

- "This should work"
- "Probably"
- "We can adjust later"
- "Temporary"
- "Quick fix"

**The session must be reset.**

---

## 24. God-Tier Additions

Every feature must:

- Preserve undo
- Preserve lineage
- Preserve credit integrity
- Preserve board sanctity
- Preserve responsiveness
- Preserve calm UI

**If any are compromised, feature is rejected.**

---

## 25. Final Enforcement Statement

Before implementing any new system, always begin with:

> "Confirming compliance with ARCHITECTURE_CANON.md. Executing task strictly under DEVELOPMENT_EXECUTION_TEMPLATE.md."

**If that sentence is not present, the work is invalid.**

---

## What This Template Forces

- Isolation
- Determinism
- Low context bleed
- No drift
- No architectural decay
- No accidental coupling
- No silent credit bugs
- No version corruption
- No UI inconsistency
