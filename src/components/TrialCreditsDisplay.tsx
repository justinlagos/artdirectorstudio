import { Sparkles } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import { SubscriptionUpgradeDialog } from "./SubscriptionUpgradeDialog";

export const TrialCreditsDisplay = () => {
  const { user } = useAuth();
  const [freeCredits, setFreeCredits] = useState<number>(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const previousCredits = useRef<number | null>(null);

  useEffect(() => {
    const fetchCredits = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('free_credits, subscription_tier')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        // Only show for free tier users
        if (data.subscription_tier === 'free') {
          const newCredits = data.free_credits || 0;
          
          // Trigger animation if credits changed
          if (previousCredits.current !== null && previousCredits.current !== newCredits) {
            setIsUpdating(true);
            setTimeout(() => setIsUpdating(false), 2000);
          }
          
          setFreeCredits(newCredits);
          previousCredits.current = newCredits;
        }
      } catch (error) {
        console.error("Error fetching trial credits:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();

    // Subscribe to changes
    const channel = supabase
      .channel('trial-credits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user?.id}`
        },
        () => {
          fetchCredits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading || freeCredits === null) return null;

  // Only show for free users with credits
  if (freeCredits === 0) {
    return (
      <>
        <Button 
          size="sm" 
          onClick={() => setShowUpgrade(true)}
          className="h-9 gap-2 text-sm font-medium bg-gradient-to-r from-primary to-primary/80"
        >
          <Sparkles className="w-4 h-4" />
          Upgrade Now
        </Button>
        <SubscriptionUpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
      </>
    );
  }

  return (
    <>
      <div className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 transition-all duration-200 ${isUpdating ? 'scale-105' : ''}`}>
        {isUpdating && (
          <div className="absolute inset-0 rounded-lg bg-primary/30 animate-pulse" />
        )}
        <Sparkles className={`relative w-4 h-4 text-primary ${isUpdating ? 'animate-pulse' : ''}`} />
        <span className={`relative text-sm font-medium ${isUpdating ? 'animate-pulse' : ''}`}>
          {freeCredits} free {freeCredits === 1 ? 'credit' : 'credits'}
        </span>
      </div>
      <SubscriptionUpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
    </>
  );
};
