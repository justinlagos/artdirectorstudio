# Job Reconciliation Test Plan

## Function: `reconcileJobsOnLoad()`

Located: `src/lib/reconcileJobs.ts`
Called from: `WorkspaceShell.tsx` on mount

## How it works

For each job persisted in sessionStorage with status `running` or `pending`:

1. Look up the `credit_transactions` row by `reservation_id`
2. Based on transaction status:
   - `completed` → mark job `done`
   - `reversed` → mark job `failed`
   - `pending` + expired → mark job `failed` (server expiry handles refund)
   - `pending` + not expired → mark job `failed` (client handler is gone after reload)
3. If no `reservation_id`, check for recent `image_versions` by `root_image_id`

## Test Scenarios

### Scenario 1: Reload after job completed server-side

**Setup:**
1. Start an Analyze operation
2. Wait for server to complete (asset stored, reservation committed)
3. Before client receives response, reload the page

**Expected:**
- `reconcileJobsOnLoad` finds `credit_transactions.status = 'completed'`
- Job marked as `done`
- Toast: "Session recovered"
- Image should already have analysis data (from server)

**Verify:**
- [ ] Job status in workspaceStore is `done`
- [ ] credit_transactions row: status = `completed`
- [ ] No duplicate credit deduction

### Scenario 2: Reload while job is still in-flight

**Setup:**
1. Start a Regenerate operation
2. Immediately reload (within 2-3 seconds, before server completes)

**Expected:**
- `reconcileJobsOnLoad` finds `credit_transactions.status = 'pending'`
- If not expired: mark `failed` (client handler gone, can't receive result)
- Server reservation will expire naturally and be refunded

**Verify:**
- [ ] Job status in workspaceStore is `failed`
- [ ] Toast: credits refund notice
- [ ] credit_transactions row: status = `pending` (server handles expiry later)
- [ ] After expiry, credit_transactions status becomes `reversed`

### Scenario 3: Reload after reservation expired

**Setup:**
1. Start a Fun Lab generation
2. Simulate: in Supabase SQL, set `expires_at = '2020-01-01'` on the credit_transaction
3. Reload the page

**Expected:**
- `reconcileJobsOnLoad` finds `credit_transactions.status = 'pending'` but `expires_at` is in the past
- Job marked as `failed`
- Credits should already be refunded by server expiry job (or will be on next check)

**Verify:**
- [ ] Job status is `failed`
- [ ] No credit loss to user
- [ ] Toast shows refund notice

## Key invariant

> Job outputs always attach to pinned `item_id` on the `AsyncJob`, never current selection.

The `reconcileJobsOnLoad` function reads `job.root_image_id` from the persisted job data, not from `canvasStore.selectedItemIds`. This is correct per ARCHITECTURE_CANON §7.
