import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "./useSubscription";
import { useCredits } from "./useCredits";

export interface FeatureAccessResult {
  canAccess: boolean;
  reason: string;
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  remaining?: number;
  requiresUpgrade: boolean;
  dailyLimit?: number;
  dailyUsage?: number;
  bypass?: boolean; // Pro/Enterprise users bypass all credit/usage checks
}

export const useFeatureAccess = () => {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { balance: creditBalance } = useCredits();
  const [freeCredits, setFreeCredits] = useState<number>(0);
  const [dailyUsage, setDailyUsage] = useState<number>(0);
  const [dailyLimit, setDailyLimit] = useState<number>(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccessData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('free_credits, daily_usage, daily_limit, daily_usage_reset_at')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setFreeCredits(data.free_credits || 0);
        setDailyUsage(data.daily_usage || 0);
        setDailyLimit(data.daily_limit || 10);
      } catch (error) {
        console.error("Error fetching access data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccessData();
  }, [user]);

  const checkAccess = (): FeatureAccessResult => {
    if (!user) {
      return {
        canAccess: false,
        reason: "Please sign in to use this feature",
        tier: 'free',
        requiresUpgrade: true,
      };
    }

    const tier = subscription.tier as 'free' | 'starter' | 'pro' | 'enterprise';

    // Enterprise: Unlimited everything + API access
    if (tier === 'enterprise') {
      return {
        canAccess: true,
        bypass: true,
        reason: "Unlimited access",
        tier: 'enterprise',
        requiresUpgrade: false,
      };
    }

    // Pro: Unlimited generations and all tools
    if (tier === 'pro' || subscription.isPro) {
      return {
        canAccess: true,
        bypass: true,
        reason: "Unlimited access",
        tier: 'pro',
        requiresUpgrade: false,
      };
    }

    // Starter: 10 per day limit
    if (tier === 'starter') {
      if (dailyUsage < dailyLimit) {
        return {
          canAccess: true,
          bypass: false,
          reason: `${dailyLimit - dailyUsage} generations remaining today`,
          tier: 'starter',
          remaining: dailyLimit - dailyUsage,
          requiresUpgrade: false,
          dailyLimit,
          dailyUsage,
        };
      }

      // If daily limit reached, check purchased credits
      if (creditBalance && creditBalance > 0) {
        return {
          canAccess: true,
          bypass: false,
          reason: `${creditBalance} extra credits remaining`,
          tier: 'starter',
          remaining: creditBalance,
          requiresUpgrade: false,
          dailyLimit,
          dailyUsage,
        };
      }

      return {
        canAccess: false,
        bypass: false,
        reason: "You've reached your daily limit. Upgrade to Pro or buy credits.",
        tier: 'starter',
        requiresUpgrade: true,
        dailyLimit,
        dailyUsage,
      };
    }

    // Free: Trial credits only
    if (freeCredits > 0) {
      return {
        canAccess: true,
        bypass: false,
        reason: `${freeCredits} free credits remaining`,
        tier: 'free',
        remaining: freeCredits,
        requiresUpgrade: false,
      };
    }

    // Check purchased credits for Free tier
    if (creditBalance && creditBalance > 0) {
      return {
        canAccess: true,
        bypass: false,
        reason: `${creditBalance} credits remaining`,
        tier: 'free',
        remaining: creditBalance,
        requiresUpgrade: false,
      };
    }

    // Out of credits
    return {
      canAccess: false,
      bypass: false,
      reason: "Your free credits are used up. Choose a plan to keep creating.",
      tier: 'free',
      requiresUpgrade: true,
    };
  };

  return { checkAccess, loading, freeCredits, dailyUsage, dailyLimit, tier: subscription.tier };
};
