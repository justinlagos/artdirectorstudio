import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useCredits = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [tier, setTier] = useState<string>('free');

  const fetchBalance = async () => {
    if (!user) {
      setBalance(null);
      setIsUnlimited(false);
      setTier('free');
      setLoading(false);
      return;
    }

    try {
      // Fetch profile data (subscription tier + free credits)
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_pro, subscription_tier, subscription_expires_at, free_credits, daily_usage, daily_limit')
        .eq('id', user.id)
        .single();

      const now = new Date();
      const userTier = profile?.subscription_tier || 'free';
      setTier(userTier);

      const isSubscriptionActive = profile?.is_pro &&
        (profile.subscription_expires_at && new Date(profile.subscription_expires_at) > now);

      // Pro/Enterprise: unlimited access
      if ((userTier === 'enterprise' || userTier === 'pro' || profile?.is_pro) && isSubscriptionActive) {
        setIsUnlimited(true);
        setBalance(999999); // High sentinel value so credit checks pass
        setLoading(false);
        return;
      }

      setIsUnlimited(false);

      // Starter tier: compute remaining daily uses
      let starterRemaining = 0;
      if (userTier === 'starter' && isSubscriptionActive) {
        const dailyUsage = profile?.daily_usage || 0;
        const dailyLimit = profile?.daily_limit || 0;
        starterRemaining = Math.max(0, dailyLimit - dailyUsage);
      }

      // Free trial credits from profiles table
      const freeCredits = profile?.free_credits || 0;

      // Top-up credits from credits table
      const { data: creditsData } = await supabase
        .from('credits')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      const topUpBalance = creditsData?.balance || 0;

      // Effective balance is the sum of all available credit sources
      setBalance(starterRemaining + freeCredits + topUpBalance);
    } catch (error) {
      console.error("Error fetching credits:", error);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetchBalance();

    // Subscribe to credit changes - only if user.id is defined
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

    // Also subscribe to profile changes (free credits, daily usage, subscription)
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

    return () => {
      supabase.removeChannel(creditChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id]);

  return { balance, loading, isUnlimited, tier, refetch: fetchBalance };
};
