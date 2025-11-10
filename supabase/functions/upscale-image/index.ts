import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { validateImageData, validateTargetSize } from '../_shared/validation.ts';
import { checkIdempotency, cacheResponse } from '../_shared/idempotency.ts';
import { createErrorResponse, mapAIError, ERROR_MESSAGES } from '../_shared/errors.ts';
import { fetchWithRetry } from '../_shared/retry.ts';

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
      return createErrorResponse(ERROR_MESSAGES.INVALID_INPUT, 401).response;
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
      return createErrorResponse(
        accessResult.reason || ERROR_MESSAGES.INVALID_INPUT,
        403
      ).response;
    }

    console.log(JSON.stringify({
      requestId,
      action: 'access_granted',
      timestamp: new Date().toISOString(),
      tier: accessResult.tier
    }));

    const { image, targetSize, idempotencyKey } = await req.json();
    
    // Input validation
    const imageValidation = validateImageData(image);
    if (!imageValidation.valid) {
      console.error(JSON.stringify({
        requestId,
        action: 'validation_failed',
        error: imageValidation.error,
        timestamp: new Date().toISOString()
      }));
      return createErrorResponse(imageValidation.error!, 400).response;
    }

    const sizeValidation = validateTargetSize(targetSize);
    if (!sizeValidation.valid) {
      console.error(JSON.stringify({
        requestId,
        action: 'validation_failed',
        error: sizeValidation.error,
        timestamp: new Date().toISOString()
      }));
      return createErrorResponse(sizeValidation.error!, 400).response;
    }

    // Check idempotency
    if (idempotencyKey) {
      const cached = await checkIdempotency(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        idempotencyKey
      );

      if (cached.cached) {
        console.log(JSON.stringify({
          requestId,
          action: 'idempotency_hit',
          timestamp: new Date().toISOString()
        }));
        return new Response(
          JSON.stringify({ ...cached.response, cached: true }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'X-Idempotency-Key': idempotencyKey
            } 
          }
        );
      }
    }
    
    console.log(JSON.stringify({
      requestId,
      action: 'upscale_params',
      timestamp: new Date().toISOString(),
      targetSize
    }));

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
      action: 'api_call_start',
      provider: 'lovable-ai-gateway',
      model: 'google/gemini-2.5-flash-image-preview',
      timestamp: new Date().toISOString()
    }));

    const response = await fetchWithRetry(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
      },
      { maxRetries: 2, baseDelayMs: 2000, maxDelayMs: 30000, timeoutMs: 45000 }
    );

    if (!response.ok) {
      const errorText = await response.text();
      const duration = Date.now() - startTime;
      
      console.error(JSON.stringify({
        requestId,
        action: 'api_error',
        provider: 'lovable-ai-gateway',
        providerStatus: response.status,
        errorCode: response.status >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR',
        duration_ms: duration,
        errorBody: errorText.substring(0, 500),
        timestamp: new Date().toISOString()
      }));

      const errorMessage = mapAIError(response.status, errorText);
      return createErrorResponse(errorMessage, response.status).response;
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
      userId,
      provider: 'lovable-ai-gateway',
      providerStatus: 200,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      imageLength: upscaledImageUrl?.length || 0
    }));

    // Save to database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let finalImageUrl = upscaledImageUrl;
    let assetData = null;

    try {
      // Extract base64 data and upload to storage
      if (upscaledImageUrl.startsWith('data:image/')) {
        const base64Data = upscaledImageUrl.split(',')[1];
        const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        const fileName = `${userId}/${Date.now()}-upscaled.png`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from('generated-images')
          .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
        } else {
          const { data: urlData } = supabaseAdmin.storage
            .from('generated-images')
            .getPublicUrl(fileName);
          finalImageUrl = urlData.publicUrl;
        }
      }

      // Save to generated_assets
      const { data: savedAsset, error: assetError } = await supabaseAdmin
        .from('generated_assets')
        .insert({
          user_id: userId,
          type: 'image',
          action: 'upscale',
          image_url: finalImageUrl,
          prompt: `Upscaled to ${targetSize}`,
          source_urls: [image.substring(0, 100)],
          params: {
            targetSize,
            operation: 'upscale'
          },
          duration_ms: duration,
        })
        .select()
        .single();

      if (assetError) {
        console.error('Database save error (non-fatal):', assetError);
      } else {
        assetData = savedAsset;
        console.log('Saved upscale to database:', assetData.id);
      }
    } catch (error) {
      console.error('Error saving upscale (non-fatal):', error);
    }

    const result = { 
      image: finalImageUrl,
      thumbnail: finalImageUrl,
      assetId: assetData?.id
    };

    // Cache response for idempotency
    if (idempotencyKey) {
      await cacheResponse(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        idempotencyKey,
        result
      );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(JSON.stringify({
      requestId,
      action: 'upscale_error',
      timestamp: new Date().toISOString(),
      error: errorMessage,
      duration,
      stack: error instanceof Error ? error.stack : undefined
    }));
    return createErrorResponse(
      ERROR_MESSAGES.PROCESSING_FAILED,
      500
    ).response;
  }
});
