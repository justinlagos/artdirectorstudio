import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const TrialWelcomeToast = () => {
  const { user } = useAuth();
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  useEffect(() => {
    const checkAndShowWelcome = async () => {
      if (!user || hasShownWelcome) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('created_at, free_credits, subscription_tier')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        // Only show for new users (created within last 5 minutes) who are on free tier with credits
        const createdAt = new Date(profile.created_at);
        const now = new Date();
        const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / 1000 / 60;

        if (
          minutesSinceCreation < 5 &&
          profile.subscription_tier === 'free' &&
          profile.free_credits > 0
        ) {
          // Delay toast slightly so it doesn't clash with other notifications
          setTimeout(() => {
            toast.success(
              `Welcome to ArtDirector Studio! You've got ${profile.free_credits} free credits to explore.`,
              {
                duration: 6000,
                icon: <Sparkles className="w-5 h-5 text-primary" />,
              }
            );
          }, 1000);
          
          setHasShownWelcome(true);
        }
      } catch (error) {
        console.error("Error checking trial welcome:", error);
      }
    };

    checkAndShowWelcome();
  }, [user, hasShownWelcome]);

  return null; // This component doesn't render anything
};
