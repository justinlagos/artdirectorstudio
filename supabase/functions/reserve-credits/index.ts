import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveAdminAccess } from "../_shared/adminAccess.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Server-side cost map aligned with src/lib/costs.ts
const COSTS_SERVER: Record<string, number> = {
  analyze: 3,
  regenerate: 6,
  funlab_3_options: 10,
  effects_commit_server: 3,
  effects_commit_client: 0,
  background_remove: 4,
  upscale: 5,
};

const RESERVATION_TTL_MINUTES = 5;

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

    const body = await req.json().catch(() => ({}));
    const amount = typeof body.amount === "number" ? body.amount : undefined;
    const action = typeof body.action === "string" ? body.action : undefined;
    const description = typeof body.description === "string" ? body.description : null;
    const idempotencyKey = typeof body.idempotency_key === "string" ? body.idempotency_key : null;

    if (amount == null || !action) {
      return new Response(
        JSON.stringify({ error: "Missing amount or action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate request using idempotency key
    if (idempotencyKey) {
      const { data: existing } = await supabaseClient
        .from("credit_transactions")
        .select("id, status")
        .eq("idempotency_key", idempotencyKey)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        if (existing.status === "completed") {
          return new Response(
            JSON.stringify({ error: "Duplicate request already completed", errorType: "duplicate_request" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ 
            reserved: existing.status === "pending", 
            reservation_id: existing.id,
            _debug: { duplicate: true }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const expectedCost = COSTS_SERVER[action];
    if (expectedCost === undefined || amount !== expectedCost) {
      return new Response(
        JSON.stringify({ error: "Invalid amount for action", required: COSTS_SERVER[action] ?? null }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin bypass: skip balance check, still create reservation for audit trail
    const adminAccess = await resolveAdminAccess(supabaseClient, user, "reserve-credits");
    console.log(`reserve-credits: Admin check result for ${user.email}:`, adminAccess);
    
    if (adminAccess.isAdmin) {
      console.log(`reserve-credits: Admin bypass activated for user ${user.id} (source: ${adminAccess.source})`);

      const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000).toISOString();
      const { data: insertRow, error: insertError } = await supabaseClient
        .from("credit_transactions")
        .insert({
          user_id: user.id,
          amount: -amount,
          status: "pending",
          expires_at: expiresAt,
          description: description ?? action,
          action: action === "analyze" ? "analyze" : action === "regenerate" ? "regenerate" : "usage",
          provider: "gemini",
          idempotency_key: idempotencyKey,
        })
        .select("id")
        .single();

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Failed to create reservation", errorType: "admin_reservation_failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          reserved: true, 
          reservation_id: insertRow.id,
          _debug: { admin_bypass: true, source: adminAccess.source }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Profile: free_credits (be resilient when profile row is missing)
    let freeCredits = 0;
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("free_credits")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("reserve-credits profile lookup error:", profileError);
    }
    if (profile) {
      freeCredits = profile.free_credits ?? 0;
    } else {
      const { error: upsertProfileError } = await supabaseClient
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email ?? null,
            free_credits: 59,
          },
          { onConflict: "id" }
        );

      if (upsertProfileError) {
        // Continue with top-up credits only to avoid hard-failing reservations.
        console.error("reserve-credits profile upsert error:", upsertProfileError);
      } else {
        freeCredits = 59;
      }
    }

    // Top-up credits
    const { data: creditsRow } = await supabaseClient
      .from("credits")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const topUpBalance = creditsRow?.balance ?? 0;
    const grossBalance = freeCredits + topUpBalance;

    // Sum of pending reservations (negative amounts)
    const { data: pendingRows } = await supabaseClient
      .from("credit_transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());

    const pendingSum = (pendingRows ?? []).reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);
    const available = Math.max(0, grossBalance - pendingSum);

    if (available < amount) {
      console.log(`reserve-credits: Insufficient credits for user ${user.id}: available=${available}, required=${amount}`);
      return new Response(
        JSON.stringify({
          reserved: false,
          available,
          required: amount,
          errorType: 'insufficient_credits',
          _debug: { freeCredits, topUpBalance, pendingSum }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000).toISOString();

    const { data: insertRow, error: insertError } = await supabaseClient
      .from("credit_transactions")
      .insert({
        user_id: user.id,
        amount: -amount,
        status: "pending",
        expires_at: expiresAt,
        description: description ?? action,
        action: action === "analyze" ? "analyze" : action === "regenerate" ? "regenerate" : action === "effects_commit_server" ? "effects_commit" : "usage",
        provider: "gemini",
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("reserve-credits insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create reservation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        reserved: true,
        reservation_id: insertRow.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("reserve-credits error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
