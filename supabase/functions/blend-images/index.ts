import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { validateImages, validateInstruction } from '../_shared/validation.ts';
import { checkIdempotency, cacheResponse } from '../_shared/idempotency.ts';
import { createErrorResponse, mapAIError, ERROR_MESSAGES } from '../_shared/errors.ts';
import { fetchWithRetry } from '../_shared/retry.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STYLE_HINTS: Record<string, string> = {
  modern: "Modern minimal aesthetic",
  cinematic: "Cinematic lighting and depth",
  editorial: "Editorial magazine composition",
  dreamlike: "Ethereal dreamlike atmosphere",
  "high-contrast": "High contrast dramatic tones",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  let userId = 'unknown';

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse(ERROR_MESSAGES.INVALID_INPUT, 401).response;
    }

    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub || 'unknown';
    } catch (e) {
      console.warn('Could not extract userId from token');
    }

    console.log(JSON.stringify({
      requestId,
      action: 'blend_start',
      timestamp: new Date().toISOString(),
      userId
    }));

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

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log(JSON.stringify({
        requestId,
        action: 'request_parsed',
        hasImages: !!requestBody.images,
        imagesCount: Array.isArray(requestBody.images) ? requestBody.images.length : 0,
        hasInstruction: !!requestBody.instruction,
        hasStylePresets: !!requestBody.stylePresets,
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

    const { images, instruction, stylePresets, idempotencyKey } = requestBody;

    // Validate images array
    console.log(JSON.stringify({
      requestId,
      action: 'validating_images',
      timestamp: new Date().toISOString()
    }));
    const imagesValidation = validateImages(images, 2, 4);
    if (!imagesValidation.valid) {
      console.error(JSON.stringify({
        requestId,
        action: 'images_validation_failed',
        error: imagesValidation.error,
        timestamp: new Date().toISOString()
      }));
      return createErrorResponse(imagesValidation.error!, 400).response;
    }

    // Instruction is now optional - validate only if provided
    if (instruction) {
      console.log(JSON.stringify({
        requestId,
        action: 'validating_instruction',
        instructionLength: instruction.length,
        timestamp: new Date().toISOString()
      }));
      const instructionValidation = validateInstruction(instruction);
      if (!instructionValidation.valid) {
        console.error(JSON.stringify({
          requestId,
          action: 'instruction_validation_failed',
          error: instructionValidation.error,
          timestamp: new Date().toISOString()
        }));
        return createErrorResponse(instructionValidation.error!, 400).response;
      }
    }

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

    const trimmedInstruction = typeof instruction === 'string' ? instruction.trim() : '';
    const presetList = Array.isArray(stylePresets)
      ? stylePresets.filter((preset: unknown): preset is string => typeof preset === 'string')
      : [];
    const presetHints = presetList
      .map((preset) => STYLE_HINTS[preset] ?? null)
      .filter((hint): hint is string => Boolean(hint));

    const baseInstruction = trimmedInstruction.length
      ? trimmedInstruction
      : 'Blend these images into a cohesive visual that respects shared color and lighting.';

    const combinedInstruction = presetHints.length
      ? `${baseInstruction}. ${presetHints.join('. ')}`
      : baseInstruction;

    const enhancedInstruction = `${combinedInstruction}. Create a seamless blend that feels unified and cohesive.`;

    type BlendContentEntry =
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } };

    // Build content array with validation
    const content: BlendContentEntry[] = [{ type: "text", text: enhancedInstruction }];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img || typeof img !== 'string') {
        console.error(JSON.stringify({
          requestId,
          action: 'content_build_error',
          error: `Image ${i} is invalid`,
          timestamp: new Date().toISOString()
        }));
        return createErrorResponse(`Image ${i + 1} is invalid`, 400).response;
      }
      content.push({ type: "image_url", image_url: { url: img } });
    }

    console.log(JSON.stringify({
      requestId,
      action: 'api_call_start',
      provider: 'lovable-ai-gateway',
      model: 'google/gemini-2.5-flash-image-preview',
      imageCount: images.length,
      instructionLength: enhancedInstruction.length,
      contentItems: content.length,
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
          messages: [{ role: "user", content }],
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
        choicesLength: data.choices?.length || 0,
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

    // Try multiple extraction paths with detailed logging
    const blendedImageUrl =
      data.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      data.choices?.[0]?.message?.content ||
      data.images?.[0]?.url ||
      data.data?.[0]?.url;

    console.log(JSON.stringify({
      requestId,
      action: 'image_extraction',
      found: !!blendedImageUrl,
      path: blendedImageUrl 
        ? (data.choices?.[0]?.message?.images?.[0]?.image_url?.url ? 'choices[0].message.images[0].image_url.url' :
           data.choices?.[0]?.message?.content ? 'choices[0].message.content' :
           data.images?.[0]?.url ? 'images[0].url' :
           'data[0].url')
        : 'none',
      imageLength: blendedImageUrl?.length || 0,
      timestamp: new Date().toISOString()
    }));

    if (!blendedImageUrl) {
      console.error(JSON.stringify({
        requestId,
        action: 'no_image_in_response',
        responseStructure: JSON.stringify(data).substring(0, 1000),
        timestamp: new Date().toISOString()
      }));
      throw new Error('No blended image returned from API');
    }

    // Validate extracted image URL format
    if (!blendedImageUrl.startsWith('data:image/') && !blendedImageUrl.startsWith('https://')) {
      console.warn(JSON.stringify({
        requestId,
        action: 'unexpected_image_format',
        urlPrefix: blendedImageUrl.substring(0, 50),
        timestamp: new Date().toISOString()
      }));
    }

    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      requestId,
      action: 'blend_success',
      userId,
      provider: 'lovable-ai-gateway',
      providerStatus: 200,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    }));

    // Save to database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let finalImageUrl = blendedImageUrl;
    let assetData = null;

    try {
      // Extract base64 data and upload to storage
      if (blendedImageUrl.startsWith('data:image/')) {
        console.log(JSON.stringify({
          requestId,
          action: 'uploading_to_storage',
          format: 'base64',
          timestamp: new Date().toISOString()
        }));

        const base64Data = blendedImageUrl.split(',')[1];
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
            
            const fileName = `${userId}/${Date.now()}-blended.png`;
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
      } else if (blendedImageUrl.startsWith('http://') || blendedImageUrl.startsWith('https://')) {
        // Already a valid URL, use as-is
        finalImageUrl = blendedImageUrl;
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
          urlPrefix: blendedImageUrl.substring(0, 100),
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

      const { data: savedAsset, error: assetError } = await supabaseAdmin
        .from('generated_assets')
        .insert({
          user_id: userId,
          type: 'image',
          action: 'blend',
          image_url: finalImageUrl,
          prompt: trimmedInstruction || 'Blended images',
          source_urls: images.map((img: string) => img.substring(0, 100)),
          params: {
            stylePresets: presetList,
            operation: 'blend',
            imageCount: images.length
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(JSON.stringify({
      requestId,
      action: 'blend_error',
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
    
    return createErrorResponse(ERROR_MESSAGES.PROCESSING_FAILED, 500).response;
  }
});
