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
    const { image } = await req.json();
    
    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
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

    console.log("Calling Lovable AI for image analysis...");

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `You are an image analysis AI that produces structured metadata and a professional descriptive prompt capable of regenerating an image in text-to-image tools like Midjourney or DALL·E.

Analyze the uploaded image and describe it across 20 creative dimensions including:
camera/lens, composition, lighting, color palette, design style, aesthetic mood, texture, environment, background, artistic medium, light source behavior, typography, aspect ratio, focal emotion, visual hierarchy, detail density, art direction, cultural influence, and intended use.

Be objective, concise, and specific. Avoid generic adjectives like "beautiful" or "stunning".

You MUST respond with a valid JSON object in this exact format:
{
  "breakdown": {
    "subject": "description",
    "camera_lens": "description",
    "composition": "description",
    "lighting": "description",
    "color_palette": "description",
    "design_style": "description",
    "aesthetic_mood": "description",
    "texture": "description",
    "environment": "description",
    "background": "description",
    "artistic_medium": "description",
    "light_source_behavior": "description",
    "typography": "description",
    "aspect_ratio": "description",
    "focal_emotion_or_posture": "description",
    "visual_hierarchy": "description",
    "detail_density": "description",
    "art_direction": "description",
    "cultural_influence": "description",
    "intended_use": "description"
  }
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image and provide detailed metadata for all 20 parameters. Return ONLY valid JSON, no other text.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
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
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("AI response received");
    
    const messageContent = data.choices?.[0]?.message?.content;
    
    if (!messageContent) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "Invalid AI response" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON from the AI response
    let analysisData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = messageContent.replace(/```json\n?|\n?```/g, '').trim();
      analysisData = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse AI response:", e, messageContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI analysis" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate the natural language prompt from the breakdown
    const breakdown = analysisData.breakdown;
    const prompt = `A ${breakdown.artistic_medium} of ${breakdown.subject} in a ${breakdown.environment}, captured with ${breakdown.camera_lens}, using ${breakdown.lighting} that enhances ${breakdown.texture}. The design style is ${breakdown.design_style}, evoking a ${breakdown.aesthetic_mood} atmosphere. The color palette features ${breakdown.color_palette}. Composition is ${breakdown.composition}, emphasizing ${breakdown.visual_hierarchy}. Background is ${breakdown.background}. Influences include ${breakdown.art_direction} with elements of ${breakdown.cultural_influence}. Ideal for a ${breakdown.intended_use} visual.`;

    return new Response(
      JSON.stringify({ 
        prompt,
        breakdown 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error("Error in analyze-image function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
