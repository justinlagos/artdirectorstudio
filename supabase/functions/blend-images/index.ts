import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateImages, validateInstruction } from '../_shared/validation.ts';
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse(ERROR_MESSAGES.INVALID_INPUT, 401).response;
    }

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

    const { images, instruction, idempotencyKey } = await req.json();
    
    const imagesValidation = validateImages(images, 2, 4);
    if (!imagesValidation.valid) {
      return createErrorResponse(imagesValidation.error!, 400).response;
    }

    // Instruction is now optional - validate only if provided
    if (instruction) {
      const instructionValidation = validateInstruction(instruction);
      if (!instructionValidation.valid) {
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Use provided instruction or create a safe default
    const enhancedInstruction = instruction?.trim() 
      ? `${instruction}. Create a seamless blend that feels unified and cohesive.`
      : 'Blend these images into a cohesive visual that respects shared color harmony and lighting. Create a seamless, professional result.';

    const content: any[] = [{ type: "text", text: enhancedInstruction }];
    for (const img of images) {
      content.push({ type: "image_url", image_url: { url: img } });
    }

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
          messages: [{ role: "user", content }],
          modalities: ["image", "text"]
        })
      },
      { maxRetries: 1, delayMs: 2000, timeoutMs: 45000 }
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

    const data = await response.json();
    let blendedImageUrl = 
      data.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      data.choices?.[0]?.message?.content ||
      data.images?.[0]?.url ||
      data.data?.[0]?.url;

    if (!blendedImageUrl) {
      throw new Error('No blended image returned from API');
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

    const result = { 
      image: blendedImageUrl,
      thumbnail: blendedImageUrl // For now, same as image. TODO: Generate actual thumbnail
    };

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
    console.error(JSON.stringify({
      requestId,
      action: 'blend_error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown',
      duration
    }));
    return createErrorResponse(ERROR_MESSAGES.PROCESSING_FAILED, 500).response;
  }
});
