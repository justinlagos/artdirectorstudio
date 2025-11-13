import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Coins, TrendingUp } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const FloatingCreditTracker = () => {
  const { balance, loading } = useCredits();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [hasNotified, setHasNotified] = useState(false);

  useEffect(() => {
    if (balance !== null && balance < 2) {
      setShowUpgrade(true);
      
      // Send email notification if we haven't already
      if (!hasNotified && user?.id) {
        sendLowCreditNotification();
        setHasNotified(true);
      }
    } else {
      setShowUpgrade(false);
      setHasNotified(false);
    }
  }, [balance, user?.id]);

  const sendLowCreditNotification = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'trial_credits_low',
          userId: user?.id,
          data: {
            creditsRemaining: balance
          }
        }
      });
    } catch (error) {
      console.error('Failed to send low credit notification:', error);
    }
  };

  if (loading || !user || balance === null) return null;

  const percentage = Math.min((balance / 10) * 100, 100);
  const isLow = balance <= 5;
  const isCritical = balance < 2;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 z-40 animate-fade-in">
      <div 
        className={`
          backdrop-blur-md rounded-full px-4 py-2.5 
          shadow-strong border-2 transition-all duration-300
          flex items-center gap-3
          ${isCritical 
            ? 'bg-destructive/10 border-destructive/50 ring-2 ring-destructive/20' 
            : isLow 
            ? 'bg-amber-500/10 border-amber-500/50'
            : 'bg-card/80 border-border/50'
          }
        `}
      >
        {/* Credit count with icon */}
        <div className="flex items-center gap-2">
          <Coins className={`w-4 h-4 ${isCritical ? 'text-destructive' : isLow ? 'text-amber-600' : 'text-primary'}`} />
          <span className={`font-semibold text-sm ${isCritical ? 'text-destructive' : ''}`}>
            {balance}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-16 h-2 rounded-full bg-muted/30 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              isCritical ? 'bg-destructive' : isLow ? 'bg-amber-500' : 'bg-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Upgrade button when low */}
        {showUpgrade && (
          <button
            onClick={() => navigate('/subscriptions')}
            className="
              flex items-center gap-1.5 
              bg-gradient-to-r from-primary to-primary/80 
              text-primary-foreground 
              px-3 py-1 rounded-full 
              text-xs font-semibold
              hover:scale-105 transition-transform
              shadow-md hover:shadow-lg
            "
          >
            <TrendingUp className="w-3 h-3" />
            Upgrade
          </button>
        )}
      </div>
    </div>
  );
};
