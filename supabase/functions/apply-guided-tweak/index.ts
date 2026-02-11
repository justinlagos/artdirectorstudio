import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPLY-GUIDED-TWEAK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    if (!userData.user) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: userData.user.id });

    // Check feature access and deduct credits
    const { data: accessData, error: accessError } = await supabaseClient.functions.invoke(
      "check-feature-access",
      {
        body: { feature: "prompt_refinement", cost: 1 },
        headers: { Authorization: authHeader },
      }
    );

    if (accessError || !accessData?.allowed) {
      logStep("Access denied", accessData);
      return new Response(
        JSON.stringify({ 
          error: accessData?.reason || "Access denied. Please check your credits." 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    logStep("Access granted", accessData);

    // Parse request body
    const { current_prompt, tweak_description, analysis } = await req.json();

    if (!current_prompt || !tweak_description) {
      throw new Error("Missing required parameters");
    }

    logStep("Request received", { 
      promptLength: current_prompt.length,
      tweak: tweak_description.substring(0, 50) + "..."
    });

    // Prepare AI prompt
    const systemPrompt = `You are an expert AI art director and prompt engineer. Your task is to take an existing image generation prompt and apply a specific modification to it with precision and creativity.

Your job is to:
1. Understand the current prompt deeply
2. Apply the requested modification intelligently
3. Maintain consistency with the original vision where appropriate
4. Return ONLY a JSON object with the updated prompt and modified analysis fields

Rules:
- Keep the original structure and quality of the prompt
- Apply the modification precisely as described
- Enhance related aspects to support the modification
- Maintain technical details (camera, composition) unless explicitly modified
- Be creative but precise

Return format (JSON only, no markdown):
{
  "full_regeneration_prompt": "The updated full prompt...",
  "modified_fields": {
    "lighting": "updated if modified",
    "mood_emotion": "updated if modified",
    "color_palette": "updated if modified",
    "design_style": "updated if modified"
  }
}`;

    const userPrompt = `Current Prompt:
${current_prompt}

Current Analysis Summary:
- Lighting: ${analysis.lighting}
- Mood: ${analysis.mood_emotion}
- Colors: ${analysis.color_palette}
- Style: ${analysis.design_style}

Requested Modification:
${tweak_description}

Apply this modification to the prompt with precision. Return ONLY the JSON response.`;

    const { chatWithProvider, getDefaultProvider } = await import("../_shared/providerClient.ts");
    const provider = getDefaultProvider();
    const hasKey = provider === "gemini" ? !!Deno.env.get("GOOGLE_AI_API_KEY") : !!Deno.env.get("OPENAI_API_KEY");
    if (!hasKey) throw new Error("AI service not configured. Set GOOGLE_AI_API_KEY or OPENAI_API_KEY in Edge Function secrets.");

    logStep("Calling AI for guided tweak...");

    const result = await chatWithProvider(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { model: provider === "gemini" ? "gemini-2.5-flash" : "gpt-4o" }
    );

    if (!result.success || !result.text) {
      logStep("AI API error", { error: result.error });
      if (result.errorType === "rate_limit") throw new Error("Rate limit exceeded. Please try again in a moment.");
      throw new Error(result.error || "AI API error");
    }

    const rawContent = result.text;

    logStep("AI response received");
    logStep("Raw AI content", rawContent.substring(0, 200) + "...");

    // Clean and parse JSON response
    let cleanedContent = rawContent.trim();
    
    // Remove markdown code blocks if present
    if (cleanedContent.startsWith("```json")) {
      cleanedContent = cleanedContent.replace(/^```json\n/, "").replace(/\n```$/, "");
    } else if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.replace(/^```\n/, "").replace(/\n```$/, "");
    }

    logStep("Cleaned content", cleanedContent.substring(0, 200) + "...");

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedContent);
    } catch (parseError) {
      logStep("JSON parse error", { error: String(parseError), content: cleanedContent.substring(0, 500) });
      throw new Error("Failed to parse AI response as JSON");
    }

    // Validate response structure
    if (!parsedResult.full_regeneration_prompt) {
      throw new Error("Invalid AI response structure");
    }

    logStep("Successfully applied guided tweak");

    // Return the modified prompt and analysis updates
    return new Response(
      JSON.stringify({
        full_regeneration_prompt: parsedResult.full_regeneration_prompt,
        modified_fields: parsedResult.modified_fields || {},
        success: true
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
