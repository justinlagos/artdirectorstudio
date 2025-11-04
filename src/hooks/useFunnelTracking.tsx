import { supabase } from "@/integrations/supabase/client";

export type FunnelEvent = "signup" | "activation" | "first_image" | "first_analysis" | "first_share";

export const useFunnelTracking = () => {
  const trackEvent = async (eventType: FunnelEvent, metadata?: Record<string, any>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("funnel_metrics").insert({
        user_id: user?.id || null,
        event_type: eventType,
        email: user?.email || null,
        metadata: metadata || {},
      });
    } catch (error) {
      console.error("Error tracking funnel event:", error);
    }
  };

  return { trackEvent };
};
