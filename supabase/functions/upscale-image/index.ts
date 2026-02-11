import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { validateImageData, validateTargetSize } from '../_shared/validation.ts';
import { checkIdempotency, cacheResponse } from '../_shared/idempotency.ts';
import { createErrorResponse, mapAIError, ERROR_MESSAGES } from '../_shared/errors.ts';
import { callProvider, getDefaultProvider } from '../_shared/providerClient.ts';
import { createLogger } from '../_shared/observability.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
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

    const logger = createLogger(requestId, userId);
    logger.logStart('upscale_image');

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

    const provider = getDefaultProvider();
    const hasKey = provider === 'gemini' ? !!Deno.env.get('GOOGLE_AI_API_KEY') : !!Deno.env.get('OPENAI_API_KEY');
    if (!hasKey) {
      console.error(JSON.stringify({
        requestId,
        action: 'config_error',
        error: `${provider === 'gemini' ? 'GOOGLE_AI_API_KEY' : 'OPENAI_API_KEY'} missing`,
        timestamp: new Date().toISOString()
      }));
      return createErrorResponse(
        `AI service not configured. Set ${provider === 'gemini' ? 'GOOGLE_AI_API_KEY' : 'OPENAI_API_KEY'} in Edge Function secrets.`,
        500
      ).response;
    }

    const upscalePrompt = targetSize === '2048x2048'
      ? "Upscale this image to ultra high resolution (2048x2048), enhancing details and clarity while preserving the original style and subject."
      : "Upscale this image to high resolution (1536x1536), enhancing details and clarity while maintaining the original composition.";

    console.log(JSON.stringify({
      requestId,
      action: 'api_call_start',
      provider,
      timestamp: new Date().toISOString()
    }));

    const providerResponse = await callProvider(
      {
        provider,
        action: 'generate',
        prompt: upscalePrompt,
        image,
        options: { temperature: 0.7, maxTokens: 2048 },
      },
      requestId
    );

    if (!providerResponse.success || !providerResponse.image) {
      const errorMessage = providerResponse.error || ERROR_MESSAGES.PROCESSING_FAILED;
      return createErrorResponse(errorMessage, providerResponse.errorType === 'rate_limit' ? 429 : 500).response;
    }

    const data = { image: providerResponse.image };
    console.log(JSON.stringify({
      requestId,
      action: 'api_response_received',
      timestamp: new Date().toISOString()
    }));

    const upscaledImageUrl = data.image;

    if (!upscaledImageUrl) {
      console.error(JSON.stringify({
        requestId,
        action: 'no_image_returned',
        timestamp: new Date().toISOString()
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
    logger.logSuccess('upscale_image', duration, {
      target_size: targetSize,
      image_length: upscaledImageUrl?.length || 0
    });

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
                fileName,
                userId,
                timestamp: new Date().toISOString()
              }));
              // CRITICAL: Storage upload failure must be fatal
              throw new Error(`Storage upload failed: ${uploadError.message}`);
            }

            // Get public URL - verify it's accessible
            const { data: urlData } = supabaseAdmin.storage
              .from('generated-images')
              .getPublicUrl(fileName);

            if (!urlData?.publicUrl) {
              console.error(JSON.stringify({
                requestId,
                action: 'public_url_error',
                error: 'No public URL returned',
                fileName,
                timestamp: new Date().toISOString()
              }));
              throw new Error('Failed to get public URL');
            }

            finalImageUrl = urlData.publicUrl;

            // Verify URL format
            if (!finalImageUrl || (!finalImageUrl.startsWith('http://') && !finalImageUrl.startsWith('https://'))) {
              console.error(JSON.stringify({
                requestId,
                action: 'invalid_url_format',
                url: finalImageUrl,
                timestamp: new Date().toISOString()
              }));
              throw new Error(`Invalid public URL format: ${finalImageUrl?.substring(0, 100)}`);
            }

            console.log(JSON.stringify({
              requestId,
              action: 'storage_upload_success',
              publicUrl: finalImageUrl,
              fileName,
              timestamp: new Date().toISOString()
            }));
          } catch (base64Error) {
            console.error(JSON.stringify({
              requestId,
              action: 'base64_decode_error',
              error: base64Error instanceof Error ? base64Error.message : 'Unknown',
              timestamp: new Date().toISOString()
            }));
          }
        }
      } else if (upscaledImageUrl.startsWith('http://') || upscaledImageUrl.startsWith('https://')) {
        // Already a valid URL, use as-is
        finalImageUrl = upscaledImageUrl;
        console.log(JSON.stringify({
          requestId,
          action: 'using_provided_url',
          url: finalImageUrl.substring(0, 100),
          timestamp: new Date().toISOString()
        }));
      } else {
        // Invalid format - must be base64 data URI or HTTP(S) URL
        console.error(JSON.stringify({
          requestId,
          action: 'invalid_image_format',
          urlPrefix: upscaledImageUrl.substring(0, 100),
          timestamp: new Date().toISOString()
        }));
        throw new Error('Invalid image format returned from AI. Expected base64 data URI or HTTP(S) URL.');
      }

      // Save to generated_assets - CRITICAL: Verify userId is valid
      if (!userId || userId === 'unknown') {
        console.error(JSON.stringify({
          requestId,
          action: 'invalid_user_id',
          userId,
          timestamp: new Date().toISOString()
        }));
        throw new Error('Invalid user ID. Cannot save to database.');
      }

      console.log(JSON.stringify({
        requestId,
        action: 'database_insert_start',
        userId,
        imageUrl: finalImageUrl.substring(0, 100),
        timestamp: new Date().toISOString()
      }));

      // Parse target size dimensions
      const [targetWidth, targetHeight] = targetSize.split('x').map(Number);
      
      const { data: savedAsset, error: assetError } = await supabaseAdmin
        .from('generated_assets')
        .insert({
          user_id: userId,
          type: 'image',
          action: 'upscale',
          operation_type: 'upscale',
          image_url: finalImageUrl,
          prompt: `Upscaled to ${targetSize}`,
          source_urls: [image.substring(0, 100)],
          model_used: 'google/gemini-3-pro-image-preview',
          width: targetWidth,
          height: targetHeight,
          params: {
            targetSize,
            operation: 'upscale',
            scale_factor: targetWidth === 2048 ? 4 : 2, // Approximate
          },
          duration_ms: duration,
          analysis_data: {
            operation_type: 'upscale',
            target_size: targetSize,
            processed_at: new Date().toISOString(),
            request_id: requestId
          }
        })
        .select()
        .single();

      if (assetError) {
        console.error(JSON.stringify({
          requestId,
          action: 'database_save_error',
          error: assetError.message,
          errorCode: assetError.code,
          errorDetails: assetError,
          userId,
          timestamp: new Date().toISOString()
        }));
        // Database errors are non-fatal for the response, but log them
        // The image URL is still valid and can be returned
      } else if (savedAsset) {
        assetData = savedAsset;
        console.log(JSON.stringify({
          requestId,
          action: 'database_save_success',
          assetId: assetData.id,
          imageUrl: assetData.image_url?.substring(0, 100),
          timestamp: new Date().toISOString()
        }));
      } else {
        console.warn(JSON.stringify({
          requestId,
          action: 'database_save_no_data',
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

    // CRITICAL: Verify finalImageUrl is valid before returning
    if (!finalImageUrl || (typeof finalImageUrl !== 'string')) {
      console.error(JSON.stringify({
        requestId,
        action: 'invalid_final_url',
        finalImageUrl: typeof finalImageUrl,
        timestamp: new Date().toISOString()
      }));
      throw new Error('Failed to generate valid image URL');
    }

    // Verify URL is accessible (must be HTTP/HTTPS or data URI)
    const isValidUrl = finalImageUrl.startsWith('http://') ||
      finalImageUrl.startsWith('https://') ||
      finalImageUrl.startsWith('data:image/');

    if (!isValidUrl) {
      console.error(JSON.stringify({
        requestId,
        action: 'invalid_url_format_final',
        url: finalImageUrl.substring(0, 200),
        timestamp: new Date().toISOString()
      }));
      throw new Error(`Invalid final URL format: ${finalImageUrl.substring(0, 100)}`);
    }

    const result = {
      image: finalImageUrl,
      thumbnail: finalImageUrl,
      assetId: assetData?.id
    };

    console.log(JSON.stringify({
      requestId,
      action: 'returning_result',
      hasImage: !!result.image,
      imageType: result.image?.startsWith('http') ? 'url' : result.image?.startsWith('data:') ? 'base64' : 'unknown',
      imageLength: result.image?.length || 0,
      hasAssetId: !!result.assetId,
      timestamp: new Date().toISOString()
    }));

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
    const logger = createLogger(requestId, userId);
    logger.logError('upscale_image', error instanceof Error ? error : new Error(String(error)), duration);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('not configured') || errorMessage.includes('API_KEY')) {
      return createErrorResponse('AI service not configured. Set GOOGLE_AI_API_KEY (or OPENAI_API_KEY) in Edge Function secrets.', 500).response;
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
