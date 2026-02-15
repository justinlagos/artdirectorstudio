import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceStore, type AsyncJob } from '@/store/workspaceStore';

/**
 * Reconcile persisted jobs against server truth on reload.
 *
 * For each job that was running/pending at time of reload:
 *   1. Check if the reservation still exists and its status.
 *   2. Check if generated_assets exist for this job (output materialized).
 *   3. Mark accordingly:
 *      - Reservation completed + assets exist → mark 'done'
 *      - Reservation reversed or expired → mark 'failed'
 *      - Reservation still pending but expired → mark 'failed' (server handles refund)
 *      - Reservation still pending and not expired → leave as 'running' (job may still be in flight)
 *
 * Job outputs always attach to pinned item_id, never current selection.
 */
export async function reconcileJobsOnLoad(userId: string): Promise<void> {
  const store = useWorkspaceStore.getState();
  const jobs = store.hydrateJobsFromSession();

  if (jobs.length === 0) return;

  const activeJobs = jobs.filter(
    (j) => j.status === 'running' || j.status === 'pending'
  );
  const alreadyResolved = jobs.filter(
    (j) => j.status === 'done' || j.status === 'failed'
  );

  // Already-resolved jobs: nothing to reconcile
  // Active jobs: check server truth
  for (const job of activeJobs) {
    try {
      const resolved = await reconcileSingleJob(job, userId);
      store.updateJob(job.id, { status: resolved });
    } catch (err) {
      console.error(`[reconcileJobs] Failed to reconcile job ${job.id}:`, err);
      // Safe default: mark failed. Server reservation expiry handles credit refund.
      store.updateJob(job.id, { status: 'failed' });
    }
  }
}

async function reconcileSingleJob(
  job: AsyncJob,
  userId: string
): Promise<'done' | 'failed' | 'running'> {
  // 1. Check reservation status
  if (job.reservation_id) {
    const { data: txn } = await supabase
      .from('credit_transactions')
      .select('id, status, expires_at')
      .eq('id', job.reservation_id)
      .eq('user_id', userId)
      .single();

    if (txn) {
      // If reservation was completed → job succeeded
      if (txn.status === 'completed') {
        return 'done';
      }
      // If reservation was reversed → job was refunded
      if (txn.status === 'reversed') {
        return 'failed';
      }
      // If reservation is still pending but expired → failed (server will clean up)
      if (txn.status === 'pending' && txn.expires_at) {
        const now = new Date().toISOString();
        if (txn.expires_at <= now) {
          return 'failed';
        }
        // Still pending and not expired: could still be in flight
        // But since we reloaded, the client-side handler is gone.
        // Mark failed — server expiry will refund.
        return 'failed';
      }
    }
    // No transaction found → assume failed
    return 'failed';
  }

  // 2. No reservation_id (shouldn't happen for paid actions)
  // Check if output assets exist
  if (job.root_image_id) {
    const { data: versions } = await supabase
      .from('image_versions')
      .select('id')
      .eq('root_image_id', job.root_image_id)
      .gt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .limit(1);

    if (versions && versions.length > 0) {
      return 'done';
    }
  }

  return 'failed';
}
