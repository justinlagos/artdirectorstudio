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
    // Check authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check feature access before processing
    const accessResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/check-feature-access`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'blend_images' }),
    });

    const accessResult = await accessResponse.json();
    
    if (!accessResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: accessResult.reason || "Access denied",
          upgrade_required: accessResult.upgrade_required || false,
          tier: accessResult.tier
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Access granted for blend:", accessResult);

    const { images, instruction } = await req.json();
    
    console.log('Blending images with instruction:', instruction);

    if (!images || !Array.isArray(images) || images.length < 2) {
      throw new Error('At least 2 images are required for blending');
    }

    if (images.length > 4) {
      throw new Error('Maximum 4 images can be blended at once');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build enhanced blending instruction for professional results
    const enhancedInstruction = instruction 
      ? `Create a professional, cohesive blend with these requirements: ${instruction}. Ensure consistent lighting direction, color grading harmony, realistic perspective alignment, and seamless visual integration.`
      : "Create a professional, designer-quality blend of these images. Ensure: 1) Consistent lighting and shadows across all elements, 2) Harmonious color grading, 3) Proper perspective and scale alignment, 4) Seamless transitions with no visible seams, 5) Unified artistic style and mood. The result should look like a single, professionally composed image.";

    // Build the content array with enhanced instruction and images
    const content = [
      {
        type: "text",
        text: enhancedInstruction
      },
      ...images.map((imageUrl: string) => ({
        type: "image_url",
        image_url: { url: imageUrl }
      }))
    ];

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
            content: content
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Blend API error:', response.status, errorText);
      throw new Error(`Failed to blend images: ${response.statusText}`);
    }

    const data = await response.json();
    const blendedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!blendedImageUrl) {
      throw new Error('No blended image returned from API');
    }

    return new Response(
      JSON.stringify({ image: blendedImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in blend-images function:', error);
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
