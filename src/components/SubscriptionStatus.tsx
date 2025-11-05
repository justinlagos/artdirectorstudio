import { useState } from "react";
import { Crown, Sparkles, Settings } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { SubscriptionUpgradeDialog } from "./SubscriptionUpgradeDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SubscriptionStatus = () => {
  const { subscription, loading } = useSubscription();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);

  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      toast.error('Failed to open subscription management. Please try again.');
    } finally {
      setManagingSubscription(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-10 w-40" />;
  }

  if (!subscription.isPro) {
    return (
      <>
        <Button 
          size="sm" 
          onClick={() => setShowUpgradeDialog(true)}
          className="h-9 gap-2 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-r from-primary to-primary/80"
        >
          <Sparkles className="w-4 h-4" />
          Upgrade to Pro
        </Button>
        <SubscriptionUpgradeDialog 
          open={showUpgradeDialog} 
          onOpenChange={setShowUpgradeDialog} 
        />
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5">
        <Crown className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">
          {subscription.tier === 'free' ? 'Free' : subscription.tier}
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleManageSubscription}
        disabled={managingSubscription}
        className="h-9 gap-1.5 text-xs"
      >
        <Settings className="w-3.5 h-3.5" />
        Manage
      </Button>
    </div>
  );
};
