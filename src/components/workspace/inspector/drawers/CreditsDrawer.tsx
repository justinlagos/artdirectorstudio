import React, { useEffect, useState } from 'react';
import { mc } from '@/lib/microcopy';
import { COSTS } from '@/lib/costs';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { supabase } from '@/integrations/supabase/client';

interface CreditTransaction {
  id: string;
  amount: number;
  status: string;
  description: string | null;
  timestamp: string;
}

export const CreditsDrawer: React.FC = () => {
  const { user } = useAuth();
  const { balance, loading, isUnlimited, tier } = useCredits();
  const jobs = useWorkspaceStore((s) => s.jobs);
  const runningJobs = jobs.filter((j) => j.status === 'running');
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoadingTxns(true);
    supabase
      .from('credit_transactions')
      .select('id, amount, status, description, timestamp')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setTransactions((data ?? []) as CreditTransaction[]);
        setLoadingTxns(false);
      });
  }, [user?.id]);

  const displayBalance = loading
    ? '…'
    : isUnlimited
      ? '∞'
      : balance ?? 0;

  const PACKS = [
    { credits: 50, price: '$4.99' },
    { credits: 150, price: '$9.99' },
    { credits: 500, price: '$24.99' },
  ];

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      {/* Current balance */}
      <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
          Available Balance
        </p>
        <p className="text-2xl font-semibold text-white/90 tabular-nums">{displayBalance}</p>
        <p className="text-[10px] text-white/30 mt-1">
          {isUnlimited ? `${tier} plan — unlimited` : `${tier} plan`}
        </p>
      </div>

      {/* Reserved (running jobs) */}
      {runningJobs.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">{mc.misc.reserved}</p>
          <div className="space-y-1">
            {runningJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between px-3 py-1.5 rounded bg-amber-500/5 border border-amber-500/10"
              >
                <span className="text-xs text-white/60">{job.action}</span>
                <span className="text-xs text-amber-400/80 tabular-nums">
                  pending
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost reference */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">{mc.misc.costReference}</p>
        <div className="space-y-1">
          {Object.entries(COSTS).map(([action, cost]) => (
            <div
              key={action}
              className="flex items-center justify-between px-3 py-1 text-xs"
            >
              <span className="text-white/50">{action.replace(/_/g, ' ')}</span>
              <span className="text-white/70 tabular-nums">
                {cost === 0 ? 'Free' : `${cost} credits`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
          Recent Transactions
        </p>
        {loadingTxns ? (
          <p className="text-xs text-white/30">{mc.loading.loading}</p>
        ) : transactions.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-white/40">{mc.workspace.empty.creditsNoTransactions.title}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between px-3 py-1.5 rounded bg-white/[0.02]"
              >
                <div>
                  <p className="text-xs text-white/60">
                    {txn.description ?? txn.status}
                  </p>
                  <p className="text-[10px] text-white/30">
                    {new Date(txn.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-xs tabular-nums ${
                    txn.amount > 0 ? 'text-green-400/80' : 'text-white/50'
                  }`}
                >
                  {txn.amount > 0 ? '+' : ''}{txn.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Low balance warning */}
      {!isUnlimited && typeof balance === 'number' && balance < 10 && (
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <p className="text-xs font-medium text-amber-400/80">
            {mc.workspace.empty.creditsLow.title}
          </p>
          <p className="text-[10px] text-amber-400/50 mt-0.5">
            {mc.workspace.empty.creditsLow.body}
          </p>
        </div>
      )}

      {/* Buy credits */}
      {!isUnlimited && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
            Buy Credits
          </p>
          <div className="space-y-2">
            {PACKS.map((pack) => (
              <button
                key={pack.credits}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <span className="text-sm text-white/70 font-medium">
                  {pack.credits} credits
                </span>
                <span className="text-sm text-[var(--sw-accent)] font-medium">
                  {pack.price}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-white/20 mt-2 text-center">
            Stripe checkout (coming soon)
          </p>
        </div>
      )}
    </div>
  );
};
