import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { debugLog } from "@/lib/debug";

const ADMIN_ROLE_STRINGS = new Set(["admin", "owner", "super_admin", "superadmin"]);
const ADMIN_BALANCE_SENTINEL = 999999;

const roleContainsAdmin = (value: unknown): boolean => {
  if (typeof value === "string") {
    return ADMIN_ROLE_STRINGS.has(value.trim().toLowerCase());
  }
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === "string" && ADMIN_ROLE_STRINGS.has(item.trim().toLowerCase()));
  }
  return false;
};

const hasAdminClaim = (user: User): boolean => {
  const appMeta = user?.app_metadata ?? {};
  const userMeta = user?.user_metadata ?? {};

  if (appMeta?.is_admin === true || userMeta?.is_admin === true) {
    return true;
  }

  return (
    roleContainsAdmin(appMeta?.role) ||
    roleContainsAdmin(userMeta?.role) ||
    roleContainsAdmin(appMeta?.roles) ||
    roleContainsAdmin(userMeta?.roles) ||
    roleContainsAdmin(appMeta?.app_role) ||
    roleContainsAdmin(userMeta?.app_role)
  );
};

export const useCredits = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [tier, setTier] = useState<string>('free');

  const fetchBalance = useCallback(async () => {
    if (!user) {
      setBalance(null);
      setPendingCount(0);
      setIsUnlimited(false);
      setTier('free');
      setLoading(false);
      return;
    }

    try {
      let adminBypass = hasAdminClaim(user);
      if (!adminBypass) {
        try {
          const { data: adminRole, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle();

          adminBypass = !!adminRole;

          // If roles table is unavailable, defer to server-side admin resolution.
          if (!adminBypass && roleError) {
            const { data: accessData, error: accessError } = await supabase.functions.invoke(
              "check-feature-access",
              { body: { action: "analyze" } }
            );
            if (!accessError && accessData?.allowed && accessData?.tier === "admin") {
              adminBypass = true;
            }
          }
        } catch (adminErr) {
          console.warn("Could not verify admin credit bypass:", adminErr);
        }
      }

      if (adminBypass) {
        setIsUnlimited(true);
        setTier("admin");
        setBalance(ADMIN_BALANCE_SENTINEL);
        setPendingCount(0);
        setLoading(false);
        return;
      }

      let profileCredits = 0;
      let profileTier = 'free';
      let unlimited = false;

      // Try to fetch profile data (subscription tier + free credits)
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('subscription_tier, subscription_status, subscription_expires_at, free_credits, daily_usage, daily_limit')
          .eq('id', user.id)
          .single();

        if (!profileError && profile) {
          const now = new Date();
          profileTier = profile.subscription_tier || 'free';

          const isSubscriptionActive = profile.subscription_status === 'active' &&
            profile.subscription_expires_at &&
            new Date(profile.subscription_expires_at) > now;

          // Pro/Enterprise: unlimited access
          if ((profileTier === 'enterprise' || profileTier === 'pro') && isSubscriptionActive) {
            unlimited = true;
          }

          // Starter tier: remaining daily uses
          if (!unlimited && profileTier === 'starter' && isSubscriptionActive) {
            const dailyUsage = profile.daily_usage || 0;
            const dailyLimit = profile.daily_limit || 0;
            profileCredits += Math.max(0, dailyLimit - dailyUsage);
          }

          // Free trial credits
          profileCredits += (profile.free_credits || 0);
        }
      } catch (profileErr) {
        console.warn("Could not fetch profile credits:", profileErr);
      }

      if (unlimited) {
        setIsUnlimited(true);
        setTier(profileTier);
        setBalance(999999);
        setPendingCount(0);
        setLoading(false);
        return;
      }

      setIsUnlimited(false);
      setTier(profileTier);

      // Top-up credits from credits table
      let topUpBalance = 0;
      try {
        const { data: creditsData } = await supabase
          .from('credits')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();
        topUpBalance = creditsData?.balance || 0;
      } catch (creditsErr) {
        console.warn("Could not fetch top-up credits:", creditsErr);
      }

      const grossBalance = profileCredits + topUpBalance;

      // Pending reservations: sum absolute amount of pending, not expired
      let pendingSum = 0;
      let pendingRowCount = 0;
      try {
        const { data: pendingRows } = await supabase
          .from('credit_transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString());
        pendingRowCount = pendingRows?.length ?? 0;
        pendingSum = (pendingRows ?? []).reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);
      } catch {
        // ignore
      }

      const available = Math.max(0, grossBalance - pendingSum);

      debugLog('credits', {
        grossBalance,
        pendingSum,
        pendingRowCount,
        available,
        tier: profileTier,
      });

      setPendingCount(pendingRowCount);
      setBalance(available);
    } catch (error) {
      console.error("Error fetching credits:", error);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetchBalance();

    // Subscribe to credit changes
    const creditChannel = supabase
      .channel('credits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credits',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchBalance();
        }
      )
      .subscribe();

    // Subscribe to profile changes (free credits, daily usage, subscription)
    const profileChannel = supabase
      .channel('profile-credits-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        () => {
          fetchBalance();
        }
      )
      .subscribe();

    // Subscribe to credit_transactions changes (reservation create/commit/refund)
    const txnChannel = supabase
      .channel('credit-txn-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_transactions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchBalance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(creditChannel);
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(txnChannel);
    };
  }, [user?.id, fetchBalance]);

  return { balance, pendingCount, loading, isUnlimited, tier, refetch: fetchBalance };
};
