import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
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

    // Check feature access directly by querying profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('subscription_tier, free_credits, daily_usage, daily_limit')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("User profile:", profile);

    // Check access based on tier
    let allowed = false;
    let reason = "";
    
    if (profile.subscription_tier === 'enterprise' || profile.subscription_tier === 'pro') {
      allowed = true;
    } else if (profile.subscription_tier === 'starter') {
      if (profile.daily_usage < profile.daily_limit) {
        allowed = true;
        // Increment daily usage
        await supabaseClient
          .from('profiles')
          .update({ daily_usage: profile.daily_usage + 1 })
          .eq('id', user.id);
      } else {
        reason = "Daily limit reached for Starter tier";
      }
    } else if (profile.subscription_tier === 'free') {
      if (profile.free_credits > 0) {
        allowed = true;
        // Deduct free credit
        await supabaseClient
          .from('profiles')
          .update({ free_credits: profile.free_credits - 1 })
          .eq('id', user.id);
      } else {
        reason = "No free credits remaining";
      }
    }

    if (!allowed) {
      console.log("Access denied:", reason);
      return new Response(
        JSON.stringify({ 
          error: reason || "Access denied",
          upgrade_required: true,
          tier: profile.subscription_tier
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Access granted for regenerate");

    const { base_analysis, user_edits } = await req.json();

    // Validate input structure
    if (!base_analysis || typeof base_analysis !== 'object') {
      return new Response(
        JSON.stringify({ error: "Invalid base_analysis structure" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user_edits || typeof user_edits !== 'object') {
      return new Response(
        JSON.stringify({ error: "Invalid user_edits structure" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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

    const response = await fetchWithRetry(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
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
      },
      { maxRetries: 3, baseDelayMs: 2000, maxDelayMs: 30000, timeoutMs: 45000 }
    );

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
