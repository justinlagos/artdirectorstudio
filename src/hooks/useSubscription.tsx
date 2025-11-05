import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SubscriptionData {
  isPro: boolean;
  tier: string;
  expiresAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData>({
    isPro: false,
    tier: 'free',
    expiresAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription({
        isPro: false,
        tier: 'free',
        expiresAt: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_pro, subscription_tier, subscription_expires_at, stripe_customer_id, stripe_subscription_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setSubscription({
        isPro: data.is_pro || false,
        tier: data.subscription_tier || 'free',
        expiresAt: data.subscription_expires_at,
        stripeCustomerId: data.stripe_customer_id,
        stripeSubscriptionId: data.stripe_subscription_id,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();

    // Subscribe to profile changes
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user?.id}`
        },
        () => {
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { subscription, loading, refetch: fetchSubscription };
};
