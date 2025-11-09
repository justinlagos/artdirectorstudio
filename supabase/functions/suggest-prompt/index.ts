import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchWithRetry } from '../_shared/retry.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, improvementType } = await req.json();
    
    console.log('Suggesting prompt improvements:', improvementType);

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = "";
    
    switch (improvementType) {
      case "enhance":
        systemPrompt = "You are an expert at enhancing image generation prompts. Take the user's prompt and make it more detailed, specific, and effective for AI image generation. Add relevant artistic details, lighting, composition, and style elements. Return ONLY the improved prompt, nothing else.";
        break;
      case "simplify":
        systemPrompt = "You are an expert at simplifying image generation prompts. Take the user's prompt and make it more concise while keeping the essential elements. Remove redundant details but preserve the core vision. Return ONLY the simplified prompt, nothing else.";
        break;
      case "artistic":
        systemPrompt = "You are an expert at making prompts more artistic. Take the user's prompt and add artistic style references, techniques, and aesthetic qualities. Include references to art movements, famous artists, or specific artistic techniques. Return ONLY the artistically enhanced prompt, nothing else.";
        break;
      default:
        systemPrompt = "You are an expert at improving image generation prompts. Take the user's prompt and make it more effective for AI image generation. Return ONLY the improved prompt, nothing else.";
    }

    const response = await fetchWithRetry(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ]
        })
      },
      { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 20000, timeoutMs: 30000 }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Suggest API error:', response.status, errorText);
      throw new Error(`Failed to generate suggestions: ${response.statusText}`);
    }

    const data = await response.json();
    const suggestedPrompt = data.choices?.[0]?.message?.content;

    if (!suggestedPrompt) {
      throw new Error('No suggestion returned from API');
    }

    return new Response(
      JSON.stringify({ suggestion: suggestedPrompt.trim() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in suggest-prompt function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
