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
  let userId = 'unknown';

  try {
    // Check authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse(ERROR_MESSAGES.INVALID_INPUT, 401).response;
    }

    // Extract user ID from token for logging
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

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log(JSON.stringify({
        requestId,
        action: 'request_parsed',
        hasImage: !!requestBody.image,
        imageLength: requestBody.image?.length || 0,
        hasTargetSize: !!requestBody.targetSize,
        targetSize: requestBody.targetSize,
        hasIdempotencyKey: !!requestBody.idempotencyKey,
        timestamp: new Date().toISOString()
      }));
    } catch (parseError) {
      console.error(JSON.stringify({
        requestId,
        action: 'parse_error',
        error: parseError instanceof Error ? parseError.message : 'Unknown',
        timestamp: new Date().toISOString()
      }));
      return createErrorResponse('Invalid request body. Expected JSON.', 400).response;
    }

    const { image, targetSize, idempotencyKey } = requestBody;
    
    // Input validation
    console.log(JSON.stringify({
      requestId,
      action: 'validating_image',
      timestamp: new Date().toISOString()
    }));
    const imageValidation = validateImageData(image);
    if (!imageValidation.valid) {
      console.error(JSON.stringify({
        requestId,
        action: 'image_validation_failed',
        error: imageValidation.error,
        timestamp: new Date().toISOString()
      }));
      return createErrorResponse(imageValidation.error!, 400).response;
    }

    console.log(JSON.stringify({
      requestId,
      action: 'validating_target_size',
      targetSize,
      timestamp: new Date().toISOString()
    }));
    const sizeValidation = validateTargetSize(targetSize);
    if (!sizeValidation.valid) {
      console.error(JSON.stringify({
        requestId,
        action: 'size_validation_failed',
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

    // Validate API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error(JSON.stringify({
        requestId,
        action: 'config_error',
        error: 'LOVABLE_API_KEY missing',
        timestamp: new Date().toISOString()
      }));
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

    // Parse and extract image from response
    let data;
    try {
      data = await response.json();
      console.log(JSON.stringify({
        requestId,
        action: 'api_response_received',
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        hasMessage: !!data.choices?.[0]?.message,
        hasImages: !!data.choices?.[0]?.message?.images,
        imageCount: data.choices?.[0]?.message?.images?.length,
        responseKeys: Object.keys(data),
        timestamp: new Date().toISOString()
      }));
    } catch (parseError) {
      console.error(JSON.stringify({
        requestId,
        action: 'api_response_parse_error',
        error: parseError instanceof Error ? parseError.message : 'Unknown',
        timestamp: new Date().toISOString()
      }));
      throw new Error('Failed to parse API response');
    }

    // Try multiple extraction paths for the upscaled image
    let upscaledImageUrl = 
      data.choices?.[0]?.message?.images?.[0]?.image_url?.url ||  // Primary path
      data.choices?.[0]?.message?.content ||                       // Fallback 1: content field
      data.images?.[0]?.url ||                                     // Fallback 2: direct images array
      data.data?.[0]?.url;                                         // Fallback 3: data array

    console.log(JSON.stringify({
      requestId,
      action: 'image_extraction',
      found: !!upscaledImageUrl,
      path: upscaledImageUrl 
        ? (data.choices?.[0]?.message?.images?.[0]?.image_url?.url ? 'choices[0].message.images[0].image_url.url' :
           data.choices?.[0]?.message?.content ? 'choices[0].message.content' :
           data.images?.[0]?.url ? 'images[0].url' :
           'data[0].url')
        : 'none',
      imageLength: upscaledImageUrl?.length || 0,
      timestamp: new Date().toISOString()
    }));

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
        action: 'unexpected_image_format',
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
        console.log(JSON.stringify({
          requestId,
          action: 'uploading_to_storage',
          format: 'base64',
          timestamp: new Date().toISOString()
        }));

        const base64Data = upscaledImageUrl.split(',')[1];
        if (!base64Data) {
          console.error(JSON.stringify({
            requestId,
            action: 'storage_upload_error',
            error: 'No base64 data found',
            timestamp: new Date().toISOString()
          }));
        } else {
          try {
            const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            
            const fileName = `${userId}/${Date.now()}-upscaled.png`;
            console.log(JSON.stringify({
              requestId,
              action: 'storage_upload_start',
              fileName,
              bufferSize: buffer.length,
              timestamp: new Date().toISOString()
            }));

            const { error: uploadError } = await supabaseAdmin.storage
              .from('generated-images')
              .upload(fileName, buffer, {
                contentType: 'image/png',
                upsert: false
              });

            if (uploadError) {
              console.error(JSON.stringify({
                requestId,
                action: 'storage_upload_error',
                error: uploadError.message,
                timestamp: new Date().toISOString()
              }));
            } else {
              const { data: urlData } = supabaseAdmin.storage
                .from('generated-images')
                .getPublicUrl(fileName);
              finalImageUrl = urlData.publicUrl;
              console.log(JSON.stringify({
                requestId,
                action: 'storage_upload_success',
                publicUrl: finalImageUrl,
                timestamp: new Date().toISOString()
              }));
            }
          } catch (base64Error) {
            console.error(JSON.stringify({
              requestId,
              action: 'base64_decode_error',
              error: base64Error instanceof Error ? base64Error.message : 'Unknown',
              timestamp: new Date().toISOString()
            }));
          }
        }
      } else {
        // Already a URL, use as-is
        finalImageUrl = upscaledImageUrl;
        console.log(JSON.stringify({
          requestId,
          action: 'using_provided_url',
          url: finalImageUrl.substring(0, 100),
          timestamp: new Date().toISOString()
        }));
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
        console.error(JSON.stringify({
          requestId,
          action: 'database_save_error',
          error: assetError.message,
          errorCode: assetError.code,
          timestamp: new Date().toISOString()
        }));
      } else {
        assetData = savedAsset;
        console.log(JSON.stringify({
          requestId,
          action: 'database_save_success',
          assetId: assetData.id,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error(JSON.stringify({
        requestId,
        action: 'save_error',
        error: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      }));
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
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(JSON.stringify({
      requestId,
      action: 'upscale_error',
      timestamp: new Date().toISOString(),
      error: errorMessage,
      stack: errorStack,
      duration_ms: duration,
      userId
    }));
    
    // Return more specific error messages when possible
    if (errorMessage.includes('LOVABLE_API_KEY')) {
      return createErrorResponse('Service configuration error. Please contact support.', 500).response;
    }
    if (errorMessage.includes('parse') || errorMessage.includes('JSON')) {
      return createErrorResponse('Invalid response from image service. Please try again.', 500).response;
    }
    
    return createErrorResponse(
      ERROR_MESSAGES.PROCESSING_FAILED,
      500
    ).response;
  }
});
