import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CHECK-RENEWAL-REMINDERS] Starting renewal reminder check");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all active pro subscriptions expiring in 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const fourDaysFromNow = new Date();
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4);

    const { data: profiles, error } = await supabaseClient
      .from("profiles")
      .select("id, email, username, subscription_tier, subscription_expires_at, stripe_subscription_id")
      .eq("is_pro", true)
      .gte("subscription_expires_at", threeDaysFromNow.toISOString())
      .lt("subscription_expires_at", fourDaysFromNow.toISOString());

    if (error) {
      console.error("[CHECK-RENEWAL-REMINDERS] Error fetching profiles:", error);
      throw error;
    }

    console.log(`[CHECK-RENEWAL-REMINDERS] Found ${profiles?.length || 0} subscriptions to notify`);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No renewals to notify", count: 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Send notification for each profile
    const notifications = profiles.map(async (profile) => {
      const renewalDate = new Date(profile.subscription_expires_at).toLocaleDateString();
      const planName = profile.subscription_tier 
        ? profile.subscription_tier.charAt(0).toUpperCase() + profile.subscription_tier.slice(1)
        : "Pro";
      
      // Determine amount based on tier
      const amountMap: Record<string, string> = {
        starter: "$3.00",
        pro: "$10.00",
        enterprise: "$25.00",
      };
      const amount = amountMap[profile.subscription_tier || "pro"] || "$10.00";

      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            type: "subscription_renewal",
            userId: profile.id,
            data: {
              planName,
              renewalDate,
              amount,
            },
          }),
        });
        
        console.log(`[CHECK-RENEWAL-REMINDERS] Sent reminder to ${profile.email}`);
        return { success: true, email: profile.email };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[CHECK-RENEWAL-REMINDERS] Failed to send to ${profile.email}:`, err);
        return { success: false, email: profile.email, error: errMsg };
      }
    });

    const results = await Promise.all(notifications);
    const successCount = results.filter(r => r.success).length;

    console.log(`[CHECK-RENEWAL-REMINDERS] Sent ${successCount}/${results.length} notifications`);

    return new Response(
      JSON.stringify({ 
        message: "Renewal reminders processed",
        total: results.length,
        successful: successCount,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[CHECK-RENEWAL-REMINDERS] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
