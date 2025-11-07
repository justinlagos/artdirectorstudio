import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "trial_credits_low" | "daily_limit_reached" | "subscription_renewal" | "payment_failure";
  userId: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { type, userId, data }: NotificationRequest = await req.json();
    console.log(`[SEND-NOTIFICATION] Processing ${type} for user ${userId}`);

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email, username")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("[SEND-NOTIFICATION] User not found:", profileError);
      throw new Error("User not found");
    }

    console.log(`[SEND-NOTIFICATION] Would send ${type} email to ${profile.email}`, data);

    return new Response(
      JSON.stringify({ success: true, message: `Notification ${type} logged for ${profile.email}` }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[SEND-NOTIFICATION] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
