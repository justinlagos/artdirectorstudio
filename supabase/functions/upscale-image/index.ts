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
    const { image, targetSize } = await req.json();
    
    console.log('Upscaling image to size:', targetSize);

    if (!image) {
      throw new Error('Image is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Use AI to upscale the image with specific instructions
    const upscalePrompt = targetSize === '2048x2048' 
      ? "Upscale this image to ultra high resolution (2048x2048), enhancing details and clarity while preserving the original style and subject."
      : "Upscale this image to high resolution (1536x1536), enhancing details and clarity while maintaining the original composition.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: upscalePrompt
              },
              {
                type: "image_url",
                image_url: { url: image }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upscale API error:', response.status, errorText);
      throw new Error(`Failed to upscale image: ${response.statusText}`);
    }

    const data = await response.json();
    const upscaledImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!upscaledImageUrl) {
      throw new Error('No upscaled image returned from API');
    }

    return new Response(
      JSON.stringify({ image: upscaledImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in upscale-image function:', error);
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
