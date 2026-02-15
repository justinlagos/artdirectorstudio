import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Cost per action for UX (aligned with src/lib/costs.ts)
const COST_BY_ACTION: Record<string, number> = {
  analyze: 3,
  analyze_image: 3,
  regenerate: 6,
  generate_image: 6,
  funlab_3_options: 10,
  effects_commit_server: 3,
  background_remove: 4,
  upscale: 5,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
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

    const { action } = await req.json().catch(() => ({}));

    // Special-case: allow caricature tool during beta/testing without consuming credits
    if (action === "caricature_image") {
      return new Response(
        JSON.stringify({
          allowed: true,
          bypass: true,
          tier: "beta",
          reason: "Caricature tool is free during testing",
          balance: 0,
          cost: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cost = typeof action === "string" ? (COST_BY_ACTION[action] ?? 1) : 1;

    // Admin bypass: check user_roles table
    const { data: adminRole, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("check-feature-access: Failed to check admin role:", roleError);
      // Don't fail the request, just log and continue to normal credit check
    }

    if (adminRole) {
      console.log(`check-feature-access: Admin bypass granted for user ${user.id}, action: ${action}`);
      return new Response(
        JSON.stringify({
          allowed: true,
          bypass: true,
          tier: "admin",
          reason: "Admin access",
          balance: 99999,
          cost,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Profile: subscription + free_credits
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("subscription_tier, subscription_status, subscription_expires_at, free_credits, daily_usage, daily_limit, daily_usage_reset_at")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Failed to load profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Top-up credits
    const { data: creditsData } = await supabaseClient
      .from("credits")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const creditBalance = creditsData?.balance ?? 0;
    const freeCredits = profile.free_credits ?? 0;
    const grossBalance = freeCredits + creditBalance;

    // Pending reservations (negative amounts)
    const { data: pendingRows } = await supabaseClient
      .from("credit_transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());

    const pendingSum = (pendingRows ?? []).reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);
    const balance = Math.max(0, grossBalance - pendingSum);

    const tier = profile.subscription_tier || "free";
    const now = new Date();
    const isSubscriptionActive =
      profile.subscription_status === "active" &&
      profile.subscription_expires_at &&
      new Date(profile.subscription_expires_at) > now;

    // Enterprise: unlimited
    if (tier === "enterprise" && isSubscriptionActive) {
      return new Response(
        JSON.stringify({
          allowed: true,
          bypass: true,
          tier: "enterprise",
          reason: "Unlimited access",
          balance,
          cost,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pro: unlimited
    if (tier === "pro" && isSubscriptionActive) {
      return new Response(
        JSON.stringify({
          allowed: true,
          bypass: true,
          tier: "pro",
          reason: "Unlimited access",
          balance,
          cost,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Starter: daily limit
    if (tier === "starter" && isSubscriptionActive) {
      if (profile.daily_usage_reset_at && new Date(profile.daily_usage_reset_at) <= now) {
        return new Response(
          JSON.stringify({
            allowed: true,
            bypass: false,
            tier: "starter",
            reason: "Daily limit reset",
            balance,
            cost,
            remaining: profile.daily_limit,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (profile.daily_usage < profile.daily_limit) {
        return new Response(
          JSON.stringify({
            allowed: true,
            bypass: false,
            tier: "starter",
            reason: `${profile.daily_limit - (profile.daily_usage ?? 0)} remaining today`,
            balance,
            cost,
            remaining: profile.daily_limit - (profile.daily_usage ?? 0),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Free / credits: check balance vs cost
    if (balance >= cost) {
      return new Response(
        JSON.stringify({
          allowed: true,
          bypass: false,
          tier: tier,
          reason: `${balance} credits available`,
          balance,
          cost,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        allowed: false,
        bypass: false,
        tier: tier,
        reason: "You have run out of credits. Please upgrade or purchase more credits.",
        balance,
        cost,
        upgrade_required: true,
        daily_usage: profile.daily_usage,
        daily_limit: profile.daily_limit,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking feature access:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
