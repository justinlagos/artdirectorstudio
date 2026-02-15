import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function commitReservation(authHeader: string, reservationId: string, action: 'commit' | 'refund') {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/commit-credits`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reservation_id: reservationId, action }),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let reservationIdForRefund: string | undefined;
  try {
    const authHeader = req.headers.get('Authorization');
    console.log("Regenerate-prompt: Received auth header:", authHeader ? "present" : "missing");
    
    if (!authHeader) {
      console.error("Regenerate-prompt: No authorization header");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    console.log("Regenerate-prompt: Getting user...");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError) {
      console.error("Regenerate-prompt: User error:", userError);
      return new Response(
        JSON.stringify({ error: "Authentication failed: " + userError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user) {
      console.error("Regenerate-prompt: No user found");
      return new Response(
        JSON.stringify({ error: "No user found" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Regenerate-prompt: User authenticated:", user.id);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let body: { base_analysis?: unknown; user_edits?: unknown; reservation_id?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reservation_id = body.reservation_id;
    reservationIdForRefund = reservation_id;
    if (!reservation_id || typeof reservation_id !== 'string') {
      return new Response(
        JSON.stringify({ error: "Missing reservation_id" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: reservation, error: resErr } = await supabaseAdmin
      .from('credit_transactions')
      .select('id, user_id, status, expires_at')
      .eq('id', reservation_id)
      .single();

    if (resErr || !reservation || reservation.user_id !== user.id || reservation.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: "Invalid or expired reservation" }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const now = new Date().toISOString();
    if (reservation.expires_at && reservation.expires_at <= now) {
      return new Response(
        JSON.stringify({ error: "Reservation expired" }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { base_analysis, user_edits } = body;

    // Validate input structure
    if (!base_analysis || typeof base_analysis !== 'object') {
      await commitReservation(authHeader, reservation_id, 'refund');
      return new Response(
        JSON.stringify({ error: "Invalid base_analysis structure" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user_edits || typeof user_edits !== 'object') {
      await commitReservation(authHeader, reservation_id, 'refund');
      return new Response(
        JSON.stringify({ error: "Invalid user_edits structure" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { chatWithProvider, getDefaultProvider } = await import('../_shared/providerClient.ts');
    const provider = getDefaultProvider();
    const hasKey = provider === 'gemini' ? !!Deno.env.get('GOOGLE_AI_API_KEY') : !!Deno.env.get('OPENAI_API_KEY');
    if (!hasKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured. Set GOOGLE_AI_API_KEY or OPENAI_API_KEY in Edge Function secrets." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Regenerating prompt with user edits...");

    const mergedAnalysis = { ...base_analysis, ...user_edits };

    const systemPrompt = `You are a professional AI prompt engineer. Given an image analysis with user edits, synthesize an improved, coherent Full Regeneration Prompt.

The prompt should:
- Be 150-200 words in a single flowing paragraph
- Incorporate all the provided analysis parameters naturally
- Use technical, professional language suitable for AI image generation
- Maintain visual coherence and artistic direction
- Be optimized for Midjourney, DALL-E, Stable Diffusion, etc.

You MUST respond with ONLY a valid JSON object in this format:
{
  "full_regeneration_prompt": "your regenerated prompt here",
  "analysis": { ...the same analysis object passed in... }
}`;

    const result = await chatWithProvider(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Here is the updated image analysis with user edits. Generate an improved Full Regeneration Prompt that incorporates these details naturally:\n\n${JSON.stringify(mergedAnalysis, null, 2)}\n\nReturn ONLY the JSON object, no markdown, no extra text.`,
        },
      ],
      { model: provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o' }
    );

    if (!result.success || !result.text) {
      await commitReservation(authHeader, reservation_id, 'refund');
      if (result.errorType === 'rate_limit') {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: result.error || "AI regeneration failed" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const messageContent = result.text;
    console.log("AI regeneration response received");

    // Parse the JSON from the AI response
    let regeneratedData;
    try {
      let cleanContent = messageContent;
      cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/\n?```/g, '');
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      cleanContent = cleanContent.trim();
      
      regeneratedData = JSON.parse(cleanContent);
      
      if (!regeneratedData.full_regeneration_prompt) {
        throw new Error("Missing full_regeneration_prompt in response");
      }
    } catch (e) {
      await commitReservation(authHeader, reservation_id, 'refund');
      const errorMessage = e instanceof Error ? e.message : "Unknown parsing error";
      console.error("Failed to parse AI response:", errorMessage);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI regeneration: " + errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await commitReservation(authHeader, reservation_id, 'commit');

    return new Response(
      JSON.stringify(regeneratedData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    if (reservationIdForRefund && req.headers.get('Authorization')) {
      await commitReservation(req.headers.get('Authorization')!, reservationIdForRefund, 'refund').catch(() => {});
    }
    console.error("Error in regenerate-prompt function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
