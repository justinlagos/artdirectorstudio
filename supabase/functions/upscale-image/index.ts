import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    
    // Check authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract user ID from token for logging
    let userId = 'unknown';
    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub || 'unknown';
    } catch (e) {
      console.warn('Could not extract userId from token');
    }

    console.log(JSON.stringify({
      requestId,
      action: 'upscale_start',
      timestamp: new Date().toISOString(),
      userId
    }));

    // Check feature access before processing
    const accessResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/check-feature-access`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'upscale_image' }),
    });

    const accessResult = await accessResponse.json();
    
    if (!accessResult.allowed) {
      console.log(JSON.stringify({
        requestId,
        action: 'access_denied',
        timestamp: new Date().toISOString(),
        reason: accessResult.reason
      }));
      return new Response(
        JSON.stringify({ 
          error: accessResult.reason || "Access denied",
          upgrade_required: accessResult.upgrade_required || false,
          tier: accessResult.tier
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(JSON.stringify({
      requestId,
      action: 'access_granted',
      timestamp: new Date().toISOString(),
      tier: accessResult.tier
    }));

    const { image, targetSize } = await req.json();
    
    console.log(JSON.stringify({
      requestId,
      action: 'upscale_params',
      timestamp: new Date().toISOString(),
      targetSize
    }));
    
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

    console.log(JSON.stringify({
      requestId,
      action: 'api_call',
      model: 'google/gemini-2.5-flash-image',
      timestamp: new Date().toISOString()
    }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
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
      
      console.error(JSON.stringify({
        requestId,
        action: 'api_error',
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText,
        timestamp: new Date().toISOString()
      }));

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please wait a moment and try again.',
            errorType: 'rate_limit',
            retryAfter: 60
          }),
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'Credits exhausted. Please add credits to your workspace to continue.',
            errorType: 'payment_required'
          }),
          { 
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      throw new Error(`Failed to upscale image: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Log full response structure for debugging
    console.log(JSON.stringify({
      requestId,
      action: 'api_response_structure',
      timestamp: new Date().toISOString(),
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasMessage: !!data.choices?.[0]?.message,
      hasImages: !!data.choices?.[0]?.message?.images,
      imageCount: data.choices?.[0]?.message?.images?.length,
      responseKeys: Object.keys(data)
    }));

    // Try multiple extraction paths for the upscaled image
    let upscaledImageUrl = 
      data.choices?.[0]?.message?.images?.[0]?.image_url?.url ||  // Primary path
      data.choices?.[0]?.message?.content ||                       // Fallback 1: content field
      data.images?.[0]?.url ||                                     // Fallback 2: direct images array
      data.data?.[0]?.url;                                         // Fallback 3: data array

    if (!upscaledImageUrl) {
      console.error(JSON.stringify({
        requestId,
        action: 'no_image_returned',
        timestamp: new Date().toISOString(),
        responseStructure: JSON.stringify(data).substring(0, 500),
        allKeys: Object.keys(data),
        choicesContent: data.choices?.[0]
      }));
      throw new Error('No upscaled image returned from API');
    }

    // Validate image format
    const isValidImage = upscaledImageUrl.startsWith('data:image/') || upscaledImageUrl.startsWith('https://');
    if (!isValidImage) {
      console.warn(JSON.stringify({
        requestId,
        action: 'invalid_image_format',
        timestamp: new Date().toISOString(),
        urlPrefix: upscaledImageUrl.substring(0, 50)
      }));
    }

    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      requestId,
      action: 'upscale_success',
      duration,
      timestamp: new Date().toISOString(),
      imageLength: upscaledImageUrl?.length || 0
    }));

    return new Response(
      JSON.stringify({ image: upscaledImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(JSON.stringify({
      action: 'upscale_error',
      timestamp: new Date().toISOString(),
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    }));
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
