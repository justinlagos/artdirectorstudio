import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { fetchWithRetry } from '../_shared/retry.ts';
import { createErrorResponse, mapAIError, ERROR_MESSAGES } from '../_shared/errors.ts';
import { checkIdempotency, cacheResponse } from '../_shared/idempotency.ts';
import {
  formatSSEMessage,
  getSSEHeaders,
  createProgressEvent,
  createCompleteEvent,
  createErrorEvent,
  type SSEProgressEvent,
} from '../_shared/sse.ts';
import { validateGenerationParams, normalizeGenerationParams, SIZE_TO_ASPECT_RATIO, type GenerationParams } from '../_shared/generationParams.ts';
import { buildPrompt, buildNegativePrompt, serializePrompt, serializeNegativePrompt } from '../_shared/promptEngine.ts';
import { createLogger } from '../_shared/observability.ts';
import { sanitizePrompt, validateImageDataUri } from '../_shared/security.ts';
import { checkRateLimit, getRateLimitConfig, createRateLimitHeaders } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  // Generate unique request ID for tracing
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Check if client wants SSE streaming
  const acceptHeader = req.headers.get('Accept') || '';
  const wantsStreaming = acceptHeader.includes('text/event-stream');

  // For SSE streaming mode
  if (wantsStreaming) {
    return handleStreamingRequest(req, requestId, startTime);
  }

  // For standard JSON mode (existing behavior, unchanged)
  return handleStandardRequest(req, requestId, startTime);
});

/**
 * Handle SSE streaming request - sends real-time progress updates
 */
async function handleStreamingRequest(
  req: Request,
  requestId: string,
  startTime: number
): Promise<Response> {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Helper to send progress
  const sendProgress = async (stage: string, progress: number, message: string) => {
    const event = createProgressEvent(stage, progress, message);
    await writer.write(encoder.encode(formatSSEMessage(event)));
  };

  // Helper to send error and close
  const sendError = async (error: string, errorType?: string, retryable = false) => {
    const event = createErrorEvent(error, requestId, errorType, retryable);
    await writer.write(encoder.encode(formatSSEMessage(event)));
    await writer.close();
  };

  // Start async processing
  (async () => {
    try {
      console.log(`[${requestId}] SSE streaming generation request started`);

      // Send initial progress
      await sendProgress('init', 5, 'Analyzing your prompt...');

      // Extract and validate JWT
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        console.error(`[${requestId}] No authorization header`);
        await sendError("Please sign in to generate images", 'auth_required');
        return;
      }

      const token = authHeader.replace('Bearer ', '');

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !userData?.user) {
        console.error(`[${requestId}] Unable to resolve user from token`, userError);
        await sendError("Invalid or expired session. Please sign in again.", 'invalid_session');
        return;
      }

      const userId = userData.user.id;
      console.log(`[${requestId}] Authenticated user: ${userId}`);
      await sendProgress('init', 10, 'Validating request...');

      // Check for idempotency
      const idempotencyKey = req.headers.get('idempotency-key');
      if (idempotencyKey) {
        const cached = await checkIdempotency(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          idempotencyKey
        );
        if (cached.cached && cached.response) {
          console.log(`[${requestId}] Returning cached response via SSE`);
          const completeEvent = createCompleteEvent(
            cached.response.image,
            cached.response.assetId,
            'Image retrieved from cache'
          );
          await writer.write(encoder.encode(formatSSEMessage(completeEvent)));
          await writer.close();
          return;
        }
      }

      // Check feature access before processing
      console.log(`[${requestId}] Checking feature access`);
      await sendProgress('init', 15, 'Checking access...');

      const accessResponse = await fetchWithRetry(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/check-feature-access`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'generate_image' }),
        },
        { maxRetries: 1, baseDelayMs: 1000, maxDelayMs: 10000, timeoutMs: 10000 }
      );

      const accessResult = await accessResponse.json();

      if (!accessResult.allowed) {
        console.log(`[${requestId}] Access denied:`, accessResult.reason);
        await sendError(
          accessResult.reason || "Access denied. Please upgrade your plan.",
          'access_denied'
        );
        return;
      }

      console.log(`[${requestId}] Access granted: ${accessResult.tier}`);

      const logger = createLogger(requestId, userId);
      logger.logStart('generate_image', { tier: accessResult.tier });

      // Rate limiting check
      const rateLimitConfig = getRateLimitConfig('generate-image', accessResult.tier || 'free');
      const rateLimitResult = await checkRateLimit(userId, 'generate-image', rateLimitConfig.maxRequests, rateLimitConfig.windowMs);
      if (!rateLimitResult.allowed) {
        logger.log('generate_image', 'rate_limit_exceeded', {
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt,
        });
        await sendError(
          `Rate limit exceeded. Please wait ${rateLimitResult.retryAfter} seconds before trying again.`,
          'rate_limit'
        );
        return;
      }

      // Parse and validate request body using generation params contract
      let requestBody: unknown;
      try {
        requestBody = await req.json();
      } catch (parseError) {
        logger.logError('generate_image', parseError instanceof Error ? parseError : new Error('Invalid JSON'), undefined, { action: 'parse_request' });
        await sendError("Invalid request body. Expected JSON.", 'validation_error');
        return;
      }

      // Convert legacy format to new format for backward compatibility
      const legacyBody = requestBody as Record<string, unknown>;
      if (legacyBody.size && !legacyBody.aspect_ratio) {
        legacyBody.aspect_ratio = SIZE_TO_ASPECT_RATIO[legacyBody.size as string] || '1:1';
      }
      if (legacyBody.referenceImageUrl) {
        legacyBody.reference_image_url = legacyBody.referenceImageUrl;
      }
      if (legacyBody.continuationStrength !== undefined) {
        legacyBody.continuation_strength = legacyBody.continuationStrength;
      }
      if (legacyBody.previousPrompt) {
        legacyBody.previous_prompt = legacyBody.previousPrompt;
      }

      // Validate using generation params contract
      const validation = validateGenerationParams(requestBody);
      if (!validation.valid || !validation.params) {
        logger.logError('generate_image', new Error(validation.error || 'Validation failed'), undefined, { action: 'validate_params' });
        await sendError(validation.error || "Invalid generation parameters", 'validation_error');
        return;
      }

      // Log received params for verification
      logger.log('generate_image', 'params_received', {
        raw_body: requestBody,
        validated_params: validation.params,
      });

      // Sanitize prompt input
      if (validation.params.prompt) {
        validation.params.prompt = sanitizePrompt(validation.params.prompt);
      }
      if (validation.params.negative_prompt) {
        validation.params.negative_prompt = sanitizePrompt(validation.params.negative_prompt);
      }

      // Validate reference image URL if provided
      if (validation.params.reference_image_url) {
        const urlValidation = validation.params.reference_image_url.startsWith('data:')
          ? validateImageDataUri(validation.params.reference_image_url)
          : { valid: validation.params.reference_image_url.startsWith('http://') || validation.params.reference_image_url.startsWith('https://') };
        
        if (!urlValidation.valid) {
          logger.logError('generate_image', new Error('Invalid reference image URL'), undefined, { action: 'validate_reference' });
          await sendError("Invalid reference image format", 'validation_error');
          return;
        }
      }

      // Sanitize prompt input
      if (validation.params.prompt) {
        validation.params.prompt = sanitizePrompt(validation.params.prompt);
      }
      if (validation.params.negative_prompt) {
        validation.params.negative_prompt = sanitizePrompt(validation.params.negative_prompt);
      }

      // Validate reference image URL if provided
      if (validation.params.reference_image_url) {
        const urlValidation = validation.params.reference_image_url.startsWith('data:')
          ? validateImageDataUri(validation.params.reference_image_url)
          : { valid: validation.params.reference_image_url.startsWith('http://') || validation.params.reference_image_url.startsWith('https://') };
        
        if (!urlValidation.valid) {
          logger.logError('generate_image', new Error('Invalid reference image URL'), undefined, { action: 'validate_reference' });
          const { response } = createErrorResponse(
            "Invalid reference image format",
            400,
            'validation_error',
            requestId
          );
          return response;
        }
      }

      // Normalize parameters with defaults
      const normalizedParams = normalizeGenerationParams(validation.params);
      logger.logParams('generate_image', normalizedParams, 'v1.0.0', 'google/gemini-3-pro-image-preview');

      // Check for DEBUG mode
      const debugMode = req.headers.get('x-debug') === 'true';
      if (debugMode) {
        const promptObject = buildPrompt(normalizedParams);
        const negativePromptObject = buildNegativePrompt(normalizedParams);
        await sendError(
          JSON.stringify({
            debug: true,
            prompt_object: promptObject,
            negative_prompt_object: negativePromptObject,
            normalized_params: normalizedParams,
          }, null, 2),
          'debug_response'
        );
        return;
      }

      await sendProgress('init', 20, 'Prompt validated...');

      // Get Lovable API key
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        logger.logError('generate_image', new Error('LOVABLE_API_KEY not configured'), undefined, { action: 'config_check' });
        await sendError("AI service not configured. Please contact support.", 'config_error');
        return;
      }

      // Build structured prompt using prompt engine
      const promptObject = buildPrompt(normalizedParams);
      const negativePromptObject = buildNegativePrompt(normalizedParams);
      const serializedPrompt = serializePrompt(promptObject);
      const serializedNegativePrompt = serializeNegativePrompt(negativePromptObject);

      // Build message content for AI API
      let messageContent: any;
      if (normalizedParams.reference_image_url) {
        messageContent = [
          {
            type: "text",
            text: serializedPrompt
          },
          {
            type: "image_url",
            image_url: {
              url: normalizedParams.reference_image_url
            }
          }
        ];
      } else {
        messageContent = serializedPrompt;
      }

      // Call AI API with progress updates
      const aiCallStart = Date.now();
      console.log(`[${requestId}] Calling AI API with model: google/gemini-3-pro-image-preview`);
      await sendProgress('generating', 25, 'Composing image...');

      // Start progress simulation during AI call (incrementing while waiting)
      let currentProgress = 25;
      const progressInterval = setInterval(async () => {
        if (currentProgress < 55) {
          currentProgress += 3;
          try {
            await sendProgress('generating', currentProgress, 'AI is creating your image...');
          } catch {
            // Stream may have closed, ignore
          }
        }
      }, 1500);

      let aiResponse;
      try {
        aiResponse = await fetchWithRetry(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-pro-image-preview",
              messages: [
                {
                  role: "user",
                  content: messageContent
                }
              ],
              modalities: ["image", "text"]
            }),
          },
          { maxRetries: 3, baseDelayMs: 2000, maxDelayMs: 30000, timeoutMs: 60000 }
        );
      } finally {
        clearInterval(progressInterval);
      }

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        const aiCallDuration = Date.now() - aiCallStart;
        console.error(`[${requestId}] AI API error (${aiCallDuration}ms):`, {
          status: aiResponse.status,
          error: errorText
        });

        const friendlyMessage = mapAIError(aiResponse.status, errorText);
        const errorType = aiResponse.status === 429 ? 'rate_limit' :
          aiResponse.status === 402 ? 'credits_exhausted' : 'ai_error';
        await sendError(friendlyMessage, errorType, errorType === 'rate_limit');
        return;
      }

      const aiCallDuration = Date.now() - aiCallStart;
      const aiData = await aiResponse.json();
      console.log(`[${requestId}] AI response received (${aiCallDuration}ms)`);
      await sendProgress('processing', 60, 'Refining details...');

      // Extract generated image
      const generatedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!generatedImageUrl) {
        console.error(`[${requestId}] No image in AI response`);
        await sendError(ERROR_MESSAGES.PROCESSING_FAILED, 'no_image_data');
        return;
      }

      console.log(`[${requestId}] Image generated, base64 length: ${generatedImageUrl.length}`);
      await sendProgress('processing', 70, 'Uploading to storage...');

      // Upload to storage
      let finalImageUrl = generatedImageUrl;
      let assetData = null;

      try {
        const storageStart = Date.now();
        console.log(`[${requestId}] Uploading to storage...`);

        // Extract base64 data
        const base64Data = generatedImageUrl.split(',')[1];
        const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Upload to storage
        const fileName = `${userId}/${Date.now()}-generated.png`;
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('generated-images')
          .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          console.error(`[${requestId}] Storage upload error:`, uploadError);
          const errorMsg = uploadError.message?.includes('quota')
            ? 'Storage quota exceeded. Please contact support.'
            : 'Failed to save image to storage. Please try again.';
          await sendError(errorMsg, 'storage_error');
          return;
        }

        const storageDuration = Date.now() - storageStart;
        console.log(`[${requestId}] Storage upload complete (${storageDuration}ms)`);
        await sendProgress('processing', 80, 'Processing complete...');

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from('generated-images')
          .getPublicUrl(fileName);
        finalImageUrl = urlData.publicUrl;

        await sendProgress('finalizing', 90, 'Saving to your projects...');

        // Save metadata to database with retry logic
        const dbStart = Date.now();
        console.log(`[${requestId}] Saving to database...`);

        let saveAttempts = 0;
        const maxSaveAttempts = 3;
        let saveSuccess = false;

        while (saveAttempts < maxSaveAttempts && !saveSuccess) {
          try {
            const { data: savedAsset, error: assetError } = await supabaseAdmin
              .from('generated_assets')
              .insert({
                user_id: userId,
                type: 'image',
                action: 'generate',
                operation_type: 'generate',
                prompt: normalizedParams.prompt,
                image_url: finalImageUrl,
                source_urls: normalizedParams.reference_image_url ? [normalizedParams.reference_image_url] : null,
                prompt_version: promptObject.version,
                full_prompt_object: promptObject,
                negative_prompt_object: negativePromptObject,
                model_used: 'google/gemini-3-pro-image-preview',
                seed: normalizedParams.seed,
                width: normalizedParams.width,
                height: normalizedParams.height,
                guidance_scale: normalizedParams.guidance_scale,
                steps: normalizedParams.steps,
                params: {
                  quality: normalizedParams.quality,
                  aspect_ratio: normalizedParams.aspect_ratio,
                  background_mode: normalizedParams.background_mode,
                  continuation_strength: normalizedParams.reference_image_url ? normalizedParams.continuation_strength : undefined,
                  had_reference: !!normalizedParams.reference_image_url
                },
                analysis_data: {
                  generation_params: normalizedParams,
                  prompt_object: promptObject,
                  negative_prompt_object: negativePromptObject,
                  generated_at: new Date().toISOString(),
                  request_id: requestId
                }
              })
              .select()
              .single();

            if (assetError) {
              saveAttempts++;
              console.error(`[${requestId}] Database save error (attempt ${saveAttempts}/${maxSaveAttempts}):`, assetError);

              if (saveAttempts < maxSaveAttempts) {
                const delay = Math.min(1000 * Math.pow(2, saveAttempts - 1), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            } else {
              const dbDuration = Date.now() - dbStart;
              assetData = savedAsset;
              saveSuccess = true;
              console.log(`[${requestId}] Database save complete (${dbDuration}ms)`);
            }
          } catch (dbSaveError) {
            saveAttempts++;
            console.error(`[${requestId}] Database save exception (attempt ${saveAttempts}/${maxSaveAttempts}):`, dbSaveError);

            if (saveAttempts < maxSaveAttempts) {
              const delay = Math.min(1000 * Math.pow(2, saveAttempts - 1), 5000);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }

        if (!saveSuccess) {
          console.warn(`[${requestId}] WARNING: Image generated but NOT saved to My Projects`);
        }
      } catch (error) {
        console.error(`[${requestId}] Failed to save image:`, error);
        await sendError("Failed to save generated image. Please try again.", 'storage_error');
        return;
      }

      const totalDuration = Date.now() - startTime;
      logger.logSuccess('generate_image', totalDuration, {
        asset_id: assetData?.id,
        image_url: finalImageUrl?.substring(0, 100),
        prompt_version: promptObject.version,
      });
      console.log(`[${requestId}] Generation complete (${totalDuration}ms)`);

      const successResponse = {
        success: true,
        image: finalImageUrl,
        assetId: assetData?.id,
        message: "Image generated successfully"
      };

      // Cache response for idempotency
      if (idempotencyKey) {
        await cacheResponse(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          idempotencyKey,
          successResponse,
          3600
        );
      }

      // Send completion event
      const completeEvent = createCompleteEvent(finalImageUrl, assetData?.id);
      await writer.write(encoder.encode(formatSSEMessage(completeEvent)));
      await writer.close();

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      const logger = createLogger(requestId, userId);
      logger.logError('generate_image', error instanceof Error ? error : new Error(String(error)), totalDuration);
      console.error(`[${requestId}] Error in SSE generate-image (${totalDuration}ms):`, error);

      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.PROCESSING_FAILED;
      try {
        await sendError(errorMessage, 'server_error');
      } catch {
        // Stream may have closed
        await writer.close().catch(() => {});
      }
    }
  })();

  return new Response(readable, {
    headers: getSSEHeaders(corsHeaders),
  });
}

/**
 * Handle standard JSON request (existing behavior, unchanged)
 */
async function handleStandardRequest(
  req: Request,
  requestId: string,
  startTime: number
): Promise<Response> {
  try {
    console.log(`[${requestId}] Generation request started`);

    // Extract and validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[${requestId}] No authorization header`);
      const { response } = createErrorResponse(
        "Please sign in to generate images",
        401,
        'auth_required',
        requestId
      );
      return response;
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error(`[${requestId}] Unable to resolve user from token`, userError);
      const { response } = createErrorResponse(
        "Invalid or expired session. Please sign in again.",
        401,
        'invalid_session',
        requestId
      );
      return response;
    }

    const userId = userData.user.id;
    console.log(`[${requestId}] Authenticated user: ${userId}`);

    // Check for idempotency
    const idempotencyKey = req.headers.get('idempotency-key');
    if (idempotencyKey) {
      const cached = await checkIdempotency(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        idempotencyKey
      );
      if (cached.cached && cached.response) {
        console.log(`[${requestId}] Returning cached response`);
        return new Response(JSON.stringify(cached.response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Check feature access before processing
    console.log(`[${requestId}] Checking feature access`);
    const accessResponse = await fetchWithRetry(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/check-feature-access`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'generate_image' }),
      },
      { maxRetries: 1, baseDelayMs: 1000, maxDelayMs: 10000, timeoutMs: 10000 }
    );

    const accessResult = await accessResponse.json();

    if (!accessResult.allowed) {
      console.log(`[${requestId}] Access denied:`, accessResult.reason);
      const { response } = createErrorResponse(
        accessResult.reason || "Access denied. Please upgrade your plan.",
        403,
        'access_denied',
        requestId,
        { tier: accessResult.tier }
      );
      return response;
    }

    console.log(`[${requestId}] Access granted: ${accessResult.tier}`);

    const logger = createLogger(requestId, userId);
    logger.logStart('generate_image', { tier: accessResult.tier });

    // Rate limiting check
    const rateLimitConfig = getRateLimitConfig('generate-image', accessResult.tier || 'free');
    const rateLimitResult = await checkRateLimit(userId, 'generate-image', rateLimitConfig.maxRequests, rateLimitConfig.windowMs);
    if (!rateLimitResult.allowed) {
      logger.log('generate_image', 'rate_limit_exceeded', {
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt,
      });
      const { response } = createErrorResponse(
        `Rate limit exceeded. Please wait ${rateLimitResult.retryAfter} seconds before trying again.`,
        429,
        'rate_limit',
        requestId,
        { retryAfter: rateLimitResult.retryAfter }
      );
      return response;
    }

    // Parse and validate request body using generation params contract
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      logger.logError('generate_image', parseError instanceof Error ? parseError : new Error('Invalid JSON'), undefined, { action: 'parse_request' });
      const { response } = createErrorResponse(
        "Invalid request body. Expected JSON.",
        400,
        'validation_error',
        requestId
      );
      return response;
    }

    // Convert legacy format to new format for backward compatibility
    const legacyBody = requestBody as Record<string, unknown>;
    if (legacyBody.size && !legacyBody.aspect_ratio) {
      legacyBody.aspect_ratio = SIZE_TO_ASPECT_RATIO[legacyBody.size as string] || '1:1';
    }
    if (legacyBody.referenceImageUrl) {
      legacyBody.reference_image_url = legacyBody.referenceImageUrl;
    }
    if (legacyBody.continuationStrength !== undefined) {
      legacyBody.continuation_strength = legacyBody.continuationStrength;
    }
    if (legacyBody.previousPrompt) {
      legacyBody.previous_prompt = legacyBody.previousPrompt;
    }

    // Validate using generation params contract
    const validation = validateGenerationParams(requestBody);
    if (!validation.valid || !validation.params) {
      logger.logError('generate_image', new Error(validation.error || 'Validation failed'), undefined, { action: 'validate_params' });
      const { response } = createErrorResponse(
        validation.error || "Invalid generation parameters",
        400,
        'validation_error',
        requestId
      );
      return response;
    }

    // Log received params for verification
    logger.log('generate_image', 'params_received', {
      raw_body: requestBody,
      validated_params: validation.params,
    });

    // Normalize parameters with defaults
    const normalizedParams = normalizeGenerationParams(validation.params);
    logger.logParams('generate_image', normalizedParams, 'v1.0.0', 'google/gemini-3-pro-image-preview');

    // Check for DEBUG mode
    const debugMode = req.headers.get('x-debug') === 'true';
    if (debugMode) {
      const promptObject = buildPrompt(normalizedParams);
      const negativePromptObject = buildNegativePrompt(normalizedParams);
      return new Response(
        JSON.stringify({
          debug: true,
          prompt_object: promptObject,
          negative_prompt_object: negativePromptObject,
          normalized_params: normalizedParams,
        }, null, 2),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      logger.logError('generate_image', new Error('LOVABLE_API_KEY not configured'), undefined, { action: 'config_check' });
      const { response } = createErrorResponse(
        "AI service not configured. Please contact support.",
        500,
        'config_error',
        requestId
      );
      return response;
    }

    // Build structured prompt using prompt engine
    const promptObject = buildPrompt(normalizedParams);
    const negativePromptObject = buildNegativePrompt(normalizedParams);
    const serializedPrompt = serializePrompt(promptObject);
    const serializedNegativePrompt = serializeNegativePrompt(negativePromptObject);

    // Build message content for AI API
    let messageContent: any;
    if (normalizedParams.reference_image_url) {
      messageContent = [
        {
          type: "text",
          text: serializedPrompt
        },
        {
          type: "image_url",
          image_url: {
            url: normalizedParams.reference_image_url
          }
        }
      ];
    } else {
      messageContent = serializedPrompt;
    }

    // Call Lovable AI Gateway with Nano Banana Pro model
    const aiCallStart = Date.now();
    console.log(`[${requestId}] Calling AI API with model: google/gemini-3-pro-image-preview (Nano Banana Pro)`);

    const aiResponse = await fetchWithRetry(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [
            {
              role: "user",
              content: messageContent
            }
          ],
          modalities: ["image", "text"]
        }),
      },
      { maxRetries: 3, baseDelayMs: 2000, maxDelayMs: 30000, timeoutMs: 60000 }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      const aiCallDuration = Date.now() - aiCallStart;
      console.error(`[${requestId}] AI API error (${aiCallDuration}ms):`, {
        status: aiResponse.status,
        error: errorText
      });

      const friendlyMessage = mapAIError(aiResponse.status, errorText);
      const { response } = createErrorResponse(
        friendlyMessage,
        aiResponse.status,
        aiResponse.status === 429 ? 'rate_limit' :
          aiResponse.status === 402 ? 'credits_exhausted' :
            'ai_error',
        requestId,
        { duration: aiCallDuration, aiStatus: aiResponse.status }
      );
      return response;
    }

    const aiCallDuration = Date.now() - aiCallStart;
    const aiData = await aiResponse.json();
    console.log(`[${requestId}] AI response received (${aiCallDuration}ms):`, {
      hasImages: !!aiData.choices?.[0]?.message?.images
    });

    // Extract generated image
    const generatedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      console.error(`[${requestId}] No image in AI response:`, JSON.stringify(aiData).substring(0, 200));
      const { response } = createErrorResponse(
        ERROR_MESSAGES.PROCESSING_FAILED,
        500,
        'no_image_data',
        requestId
      );
      return response;
    }

    console.log(`[${requestId}] Image generated, base64 length: ${generatedImageUrl.length}`);

    // Upload to storage instead of saving base64 to database
    let finalImageUrl = generatedImageUrl;
    let assetData = null;

    try {
      const storageStart = Date.now();
      console.log(`[${requestId}] Uploading to storage...`);

      // Extract base64 data
      const base64Data = generatedImageUrl.split(',')[1];
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      // Upload to storage
      const fileName = `${userId}/${Date.now()}-generated.png`;
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('generated-images')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error(`[${requestId}] Storage upload error:`, uploadError);
        const { response } = createErrorResponse(
          uploadError.message?.includes('quota')
            ? 'Storage quota exceeded. Please contact support.'
            : 'Failed to save image to storage. Please try again.',
          500,
          'storage_error',
          requestId,
          { uploadError: uploadError.message }
        );
        return response;
      }

      const storageDuration = Date.now() - storageStart;
      console.log(`[${requestId}] Storage upload complete (${storageDuration}ms)`);

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('generated-images')
        .getPublicUrl(fileName);
      finalImageUrl = urlData.publicUrl;

      // Save metadata to database with retry logic
      const dbStart = Date.now();
      console.log(`[${requestId}] Saving to database...`);

      let saveAttempts = 0;
      const maxSaveAttempts = 3;
      let saveSuccess = false;

      while (saveAttempts < maxSaveAttempts && !saveSuccess) {
        try {
          const { data: savedAsset, error: assetError } = await supabaseAdmin
            .from('generated_assets')
            .insert({
              user_id: userId,
              type: 'image',
              action: 'generate',
              operation_type: 'generate',
              prompt: normalizedParams.prompt,
              image_url: finalImageUrl,
              source_urls: normalizedParams.reference_image_url ? [normalizedParams.reference_image_url] : null,
              prompt_version: promptObject.version,
              full_prompt_object: promptObject,
              negative_prompt_object: negativePromptObject,
              model_used: 'google/gemini-3-pro-image-preview',
              seed: normalizedParams.seed,
              width: normalizedParams.width,
              height: normalizedParams.height,
              guidance_scale: normalizedParams.guidance_scale,
              steps: normalizedParams.steps,
              params: {
                quality: normalizedParams.quality,
                aspect_ratio: normalizedParams.aspect_ratio,
                background_mode: normalizedParams.background_mode,
                continuation_strength: normalizedParams.reference_image_url ? normalizedParams.continuation_strength : undefined,
                had_reference: !!normalizedParams.reference_image_url
              },
              analysis_data: {
                generation_params: normalizedParams,
                prompt_object: promptObject,
                negative_prompt_object: negativePromptObject,
                generated_at: new Date().toISOString(),
                request_id: requestId
              }
            })
            .select()
            .single();

          if (assetError) {
            saveAttempts++;
            console.error(`[${requestId}] Database save error (attempt ${saveAttempts}/${maxSaveAttempts}):`, {
              error: assetError.message,
              code: assetError.code,
              details: assetError.details
            });

            if (saveAttempts < maxSaveAttempts) {
              // Wait before retry with exponential backoff
              const delay = Math.min(1000 * Math.pow(2, saveAttempts - 1), 5000);
              console.log(`[${requestId}] Retrying database save in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              console.error(`[${requestId}] All database save attempts failed. Image available at: ${finalImageUrl}`);
              // Still continue - image is generated and uploaded, but metadata save failed
            }
          } else {
            const dbDuration = Date.now() - dbStart;
            assetData = savedAsset;
            saveSuccess = true;
            console.log(`[${requestId}] Database save complete (${dbDuration}ms, attempt ${saveAttempts + 1})`);
            console.log(`[${requestId}] Asset details:`, {
              assetId: assetData.id,
              hasImageUrl: !!assetData.image_url,
              hasPrompt: !!assetData.prompt,
              userId: assetData.user_id
            });
          }
        } catch (dbSaveError) {
          saveAttempts++;
          console.error(`[${requestId}] Database save exception (attempt ${saveAttempts}/${maxSaveAttempts}):`, {
            error: dbSaveError instanceof Error ? dbSaveError.message : 'Unknown',
            stack: dbSaveError instanceof Error ? dbSaveError.stack : undefined
          });

          if (saveAttempts < maxSaveAttempts) {
            const delay = Math.min(1000 * Math.pow(2, saveAttempts - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (!saveSuccess) {
        console.warn(`[${requestId}] WARNING: Image generated but NOT saved to My Projects. Image URL: ${finalImageUrl}`);
      }
    } catch (error) {
      console.error(`[${requestId}] Failed to save image:`, error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const { response } = createErrorResponse(
        "Failed to save generated image. Please try again.",
        500,
        'storage_error',
        requestId,
        { saveError: errorMessage }
      );
      return response;
    }

    const totalDuration = Date.now() - startTime;
    logger.logSuccess('generate_image', totalDuration, {
      asset_id: assetData?.id,
      image_url: finalImageUrl?.substring(0, 100),
      prompt_version: promptObject.version,
    });
    console.log(`[${requestId}] Generation complete (${totalDuration}ms)`);

    const successResponse = {
      success: true,
      image: finalImageUrl,
      assetId: assetData?.id,
      message: "Image generated successfully"
    };

    // Cache response for idempotency
    if (idempotencyKey) {
      await cacheResponse(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        idempotencyKey,
        successResponse,
        3600 // 1 hour TTL
      );
    }

    return new Response(
      JSON.stringify(successResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    const logger = createLogger(requestId);
    logger.logError('generate_image', error instanceof Error ? error : new Error(String(error)), totalDuration);
    console.error(`[${requestId}] Error in generate-image function (${totalDuration}ms):`, error);

    const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.PROCESSING_FAILED;
    const { response } = createErrorResponse(
      errorMessage,
      500,
      'server_error',
      requestId,
      { duration: totalDuration }
    );
    return response;
  }
}

// Legacy buildMessageContent function removed - now using prompt engine
// This function is kept for reference but should not be used
// All prompt building is now handled by the prompt engine in _shared/promptEngine.ts
