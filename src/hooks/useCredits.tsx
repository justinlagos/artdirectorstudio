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
      let profileCredits = 0;
      let profileTier = 'free';
      let unlimited = false;

      // Try to fetch profile data (subscription tier + free credits)
      // Wrapped in its own try/catch so a profile query failure doesn't
      // block reading the credits table
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_pro, subscription_tier, subscription_expires_at, free_credits, daily_usage, daily_limit')
          .eq('id', user.id)
          .single();

        if (!profileError && profile) {
          const now = new Date();
          profileTier = profile.subscription_tier || 'free';

          const isSubscriptionActive = profile.is_pro &&
            profile.subscription_expires_at &&
            new Date(profile.subscription_expires_at) > now;

          // Pro/Enterprise: unlimited access
          if ((profileTier === 'enterprise' || profileTier === 'pro' || profile.is_pro) && isSubscriptionActive) {
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
        setLoading(false);
        return;
      }

      setIsUnlimited(false);
      setTier(profileTier);

      // Top-up credits from credits table (always try this)
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

      setBalance(profileCredits + topUpBalance);
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

    return () => {
      supabase.removeChannel(creditChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id]);

  return { balance, loading, isUnlimited, tier, refetch: fetchBalance };
};
