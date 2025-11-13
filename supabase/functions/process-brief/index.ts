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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[PROCESS-BRIEF] Missing LOVABLE_API_KEY");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const truncatedBrief = text.length > 20000 ? text.slice(0, 20000) : text;

    const systemPrompt = `You are Artie, a world-class executive creative director.
- Diagnose creative briefs with senior-level rigor
- Extract strategic essentials succinctly
- Identify visual, tonal, and experiential opportunities
- Output confident, production-ready recommendations
- Respond in JSON only.`;

    const userPrompt = `Filename: ${filename}

Brief:
${truncatedBrief}`;

    const modelResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "creative_brief_analysis",
            schema: {
              type: "object",
              required: ["summary", "key_insights"],
              properties: {
                summary: {
                  type: "string",
                  description: "1-2 sentence overview of the brief's core ask.",
                },
                project_type: {
                  type: "string",
                  description: "Category or project archetype inferred from the brief.",
                },
                target_audience: {
                  type: "string",
                  description: "Primary audience description if present or implied.",
                },
                key_insights: {
                  type: "array",
                  items: { type: "string" },
                  description: "3-5 punchy insights or mandates from the brief.",
                  minItems: 1,
                },
                deliverables: {
                  type: "array",
                  items: { type: "string" },
                  description: "Notable assets, channels, or deliverables called out.",
                },
                tonal_keywords: {
                  type: "array",
                  items: { type: "string" },
                  description: "Mood, tone, or stylistic anchors to honor.",
                },
                suggested_actions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Next-step recommendations Artie can offer.",
                },
              },
            },
          },
        },
      }),
    });

    if (!modelResponse.ok) {
      const errorText = await modelResponse.text();
      console.error("[PROCESS-BRIEF] Model error:", modelResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to interpret brief" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await modelResponse.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      console.error("[PROCESS-BRIEF] Empty model response", data);
      throw new Error("AI response was empty");
    }

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

