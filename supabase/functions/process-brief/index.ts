import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type BriefResponse = {
  summary: string;
  project_type?: string;
  target_audience?: string;
  key_insights: string[];
  deliverables?: string[];
  tonal_keywords?: string[];
  suggested_actions?: string[];
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text : "";
    const filename = typeof body?.filename === "string" ? body.filename : "untitled";

    if (!text || text.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Brief text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { chatWithProvider, getDefaultProvider } = await import("../_shared/providerClient.ts");
    const provider = getDefaultProvider();
    const hasKey = provider === "gemini" ? !!Deno.env.get("GOOGLE_AI_API_KEY") : !!Deno.env.get("OPENAI_API_KEY");
    if (!hasKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured. Set GOOGLE_AI_API_KEY or OPENAI_API_KEY in Edge Function secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const truncatedBrief = text.length > 20000 ? text.slice(0, 20000) : text;

    const systemPrompt = `You are Artie, a world-class executive creative director.
- Diagnose creative briefs with senior-level rigor
- Extract strategic essentials succinctly
- Identify visual, tonal, and experiential opportunities
- Output confident, production-ready recommendations
- Respond with ONLY a valid JSON object (no markdown, no code blocks) with these keys: summary (string), project_type (string), target_audience (string), key_insights (array of strings, at least 1), deliverables (array of strings), tonal_keywords (array of strings), suggested_actions (array of strings).`;

    const userPrompt = `Filename: ${filename}

Brief:
${truncatedBrief}`;

    const result = await chatWithProvider(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { model: provider === "gemini" ? "gemini-2.5-flash" : "gpt-4o" }
    );

    if (!result.success || !result.text) {
      console.error("[PROCESS-BRIEF] Model error:", result.error);
      return new Response(
        JSON.stringify({ error: result.error || "Failed to interpret brief" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let content = result.text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) content = jsonMatch[0];

    let parsed: BriefResponse;
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch (parseError) {
      console.error("[PROCESS-BRIEF] JSON parse error:", parseError, content);
      throw new Error("Unable to parse brief analysis");
    }

    return new Response(
      JSON.stringify(parsed),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[PROCESS-BRIEF] Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

