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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action } = await req.json();

    // Fetch user profile with subscription and usage data
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_pro, subscription_tier, subscription_expires_at, free_credits, daily_usage, daily_limit, daily_usage_reset_at')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const tier = profile.subscription_tier || 'free';
    const now = new Date();

    // Check if subscription is active
    const isSubscriptionActive = profile.is_pro && 
      (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > now);

    // Enterprise: Unlimited + API access
    if (tier === 'enterprise' && isSubscriptionActive) {
      return new Response(
        JSON.stringify({
          allowed: true,
          tier: 'enterprise',
          reason: 'Unlimited access',
          bypass: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pro: Unlimited
    if ((tier === 'pro' || profile.is_pro) && isSubscriptionActive) {
      return new Response(
        JSON.stringify({
          allowed: true,
          tier: 'pro',
          reason: 'Unlimited access',
          bypass: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Starter: Check daily limit
    if (tier === 'starter' && isSubscriptionActive) {
      // Reset daily usage if needed
      if (profile.daily_usage_reset_at && new Date(profile.daily_usage_reset_at) <= now) {
        await supabaseClient
          .from('profiles')
          .update({
            daily_usage: 0,
            daily_usage_reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('id', user.id);

        return new Response(
          JSON.stringify({
            allowed: true,
            tier: 'starter',
            reason: 'Daily limit reset',
            remaining: profile.daily_limit,
            willDeduct: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (profile.daily_usage >= profile.daily_limit) {
        return new Response(
          JSON.stringify({
            allowed: false,
            tier: 'starter',
            reason: "You've reached your daily 10 generations. Upgrade to Pro for unlimited access.",
            upgrade_required: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Increment daily usage
      await supabaseClient
        .from('profiles')
        .update({ daily_usage: profile.daily_usage + 1 })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({
          allowed: true,
          tier: 'starter',
          reason: `${profile.daily_limit - profile.daily_usage - 1} remaining today`,
          remaining: profile.daily_limit - profile.daily_usage - 1,
          deducted: 1
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Free tier: Use trial credits
    if (profile.free_credits > 0) {
      await supabaseClient
        .from('profiles')
        .update({ free_credits: profile.free_credits - 1 })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({
          allowed: true,
          tier: 'free',
          reason: `${profile.free_credits - 1} free credits remaining`,
          remaining: profile.free_credits - 1,
          deducted: 1
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No access
    return new Response(
      JSON.stringify({
        allowed: false,
        tier: 'free',
        reason: "Your free credits are used up. Choose a plan to keep creating.",
        upgrade_required: true
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error checking feature access:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
