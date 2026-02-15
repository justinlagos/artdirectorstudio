import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function commitReservation(authHeader: string, reservationId: string, action: "commit" | "refund") {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/commit-credits`;
  await fetch(url, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({ reservation_id: reservationId, action }),
  });
}

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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const source_url = typeof body.source_url === "string" ? body.source_url : undefined;
    const effects_stack = Array.isArray(body.effects_stack) ? body.effects_stack : [];
    const reservation_id = typeof body.reservation_id === "string" ? body.reservation_id : undefined;

    if (!source_url || !reservation_id) {
      return new Response(
        JSON.stringify({ error: "Missing source_url or reservation_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: reservation, error: resErr } = await supabaseAdmin
      .from("credit_transactions")
      .select("id, user_id, status, expires_at")
      .eq("id", reservation_id)
      .single();

    if (resErr || !reservation || reservation.user_id !== user.id || reservation.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Invalid or expired reservation" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const now = new Date().toISOString();
    if (reservation.expires_at && reservation.expires_at <= now) {
      return new Response(
        JSON.stringify({ error: "Reservation expired" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Lane B effects: server-side processing. Supabase Edge does not ship sharp by default;
    // for a full implementation you would use an image library (e.g. via npm or WASM).
    // Here we fetch the image and re-upload to storage as the "processed" result so that
    // commit/refund flow and URL return work. Replace with actual Lane B effect pipeline when available.
    let resultUrl = source_url;
    let thumbnailUrl = source_url;

    try {
      const resp = await fetch(source_url);
      if (!resp.ok) throw new Error("Failed to fetch source image");
      const blob = await resp.blob();
      const fileName = `${user.id}/effects/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.png`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("generated-images")
        .upload(fileName, blob, { contentType: blob.type || "image/png", upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabaseAdmin.storage.from("generated-images").getPublicUrl(fileName);
      resultUrl = urlData.publicUrl;
      thumbnailUrl = urlData.publicUrl;
    } catch (err) {
      console.error("apply-effects processing error:", err);
      await commitReservation(authHeader, reservation_id, "refund");
      return new Response(
        JSON.stringify({ error: "Effects processing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await commitReservation(authHeader, reservation_id, "commit");

    return new Response(
      JSON.stringify({ url: resultUrl, thumbnail_url: thumbnailUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("apply-effects error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
