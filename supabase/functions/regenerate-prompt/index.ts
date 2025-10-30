import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { base_analysis, user_edits } = await req.json();
    
    if (!base_analysis || !user_edits) {
      return new Response(
        JSON.stringify({ error: "Missing base_analysis or user_edits" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Regenerating prompt with user edits...");

    // Merge user edits into base analysis
    const mergedAnalysis = {
      ...base_analysis,
      ...user_edits
    };

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a professional AI prompt engineer. Given an image analysis with user edits, synthesize an improved, coherent Full Regeneration Prompt.

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
}`
          },
          {
            role: 'user',
            content: `Here is the updated image analysis with user edits. Generate an improved Full Regeneration Prompt that incorporates these details naturally:

${JSON.stringify(mergedAnalysis, null, 2)}

Return ONLY the JSON object, no markdown, no extra text.`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI regeneration failed" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("AI regeneration response received");
    
    const messageContent = data.choices?.[0]?.message?.content;
    
    if (!messageContent) {
      console.error("No content in AI response", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Invalid AI response" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      const errorMessage = e instanceof Error ? e.message : "Unknown parsing error";
      console.error("Failed to parse AI response:", errorMessage);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI regeneration: " + errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(regeneratedData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error("Error in regenerate-prompt function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
