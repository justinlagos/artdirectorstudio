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
        model: "google/gemini-2.5-pro", // Using Pro model for better quality blending
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
      
      // Try to parse error details for better user feedback
      let specificMessage = null;
      try {
        const errorData = JSON.parse(errorText);
        const providerError = errorData?.error?.metadata?.raw;
        if (providerError) {
          const parsedProviderError = JSON.parse(providerError);
          specificMessage = parsedProviderError?.error?.message;
        }
      } catch (parseError) {
        // If parsing fails, continue with generic message
      }
      
      // Check for region restriction
      if (specificMessage?.toLowerCase().includes('not available in your country')) {
        throw new Error('IMAGE_BLEND_UNAVAILABLE');
      }
      
      throw new Error(specificMessage || `Failed to blend images: ${response.statusText}`);
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
