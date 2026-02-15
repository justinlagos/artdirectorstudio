import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    const body = await req.json().catch(() => ({}));
    const reservation_id = typeof body.reservation_id === "string" ? body.reservation_id : undefined;
    const action = body.action === "commit" || body.action === "refund" ? body.action : undefined;

    if (!reservation_id || !action) {
      return new Response(
        JSON.stringify({ error: "Missing reservation_id or action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: row, error: fetchError } = await supabaseClient
      .from("credit_transactions")
      .select("id, user_id, amount, status, expires_at")
      .eq("id", reservation_id)
      .single();

    if (fetchError || !row) {
      return new Response(
        JSON.stringify({ error: "Reservation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (row.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (row.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Reservation already committed or reversed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    if (row.expires_at && row.expires_at <= now) {
      return new Response(
        JSON.stringify({ error: "Reservation expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amount = Math.abs(Number(row.amount));

    if (action === "refund") {
      await supabaseClient
        .from("credit_transactions")
        .update({ status: "reversed", committed_at: now })
        .eq("id", reservation_id);

      return new Response(
        JSON.stringify({ success: true, refunded: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // commit: mark completed and apply deduction
    await supabaseClient
      .from("credit_transactions")
      .update({ status: "completed", committed_at: now })
      .eq("id", reservation_id);

    // Apply deduction: prefer free_credits, then credits table
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("free_credits")
      .eq("id", user.id)
      .single();

    const freeCredits = profile?.free_credits ?? 0;

    if (freeCredits >= amount) {
      await supabaseClient
        .from("profiles")
        .update({ free_credits: freeCredits - amount })
        .eq("id", user.id);
    } else {
      const fromFree = freeCredits;
      const fromTopUp = amount - fromFree;
      if (fromFree > 0) {
        await supabaseClient
          .from("profiles")
          .update({ free_credits: 0 })
          .eq("id", user.id);
      }
      const { data: cred } = await supabaseClient
        .from("credits")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      const currentBalance = cred?.balance ?? 0;
      const newBalance = Math.max(0, currentBalance - fromTopUp);
      if (cred) {
        await supabaseClient
          .from("credits")
          .update({ balance: newBalance, updated_at: now })
          .eq("user_id", user.id);
      } else if (fromTopUp > 0) {
        await supabaseClient
          .from("credits")
          .insert({ user_id: user.id, balance: newBalance, updated_at: now });
      }
    }

    // Compute new balance for response
    const { data: p2 } = await supabaseClient
      .from("profiles")
      .select("free_credits")
      .eq("id", user.id)
      .single();
    const { data: c2 } = await supabaseClient
      .from("credits")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    const new_balance = (p2?.free_credits ?? 0) + (c2?.balance ?? 0);

    return new Response(
      JSON.stringify({ success: true, new_balance }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("commit-credits error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
