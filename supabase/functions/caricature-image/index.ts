import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { callProvider, type ProviderRequest } from '../_shared/providerClient.ts';
import { createErrorResponse, ERROR_MESSAGES } from '../_shared/errors.ts';
import { createLogger } from '../_shared/observability.ts';
import { checkIdempotency, cacheResponse } from '../_shared/idempotency.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Caricature presets with optimized prompts
const PRESETS = {
  studio: {
    name: "Studio Caricature",
    prompt: "Professional studio caricature portrait with exaggerated features in a polished, clean style. Smooth gradients, warm studio lighting, professional artistic rendering. Features are proportionally exaggerated while maintaining recognizable likeness. Clean white or subtle gradient background. High-end digital illustration quality.",
    continuation_strength: 0.7,
    guidance_scale: 8.0,
    quality: "premium",
  },
  editorial: {
    name: "Editorial Caricature",
    prompt: "Editorial cartoon caricature in bold ink and watercolor style. Expressive linework, vibrant colors, dynamic composition. Exaggerated facial features with satirical artistic flair. Energetic brushstrokes and confident pen work. Signature editorial illustration style with personality and character.",
    continuation_strength: 0.6,
    guidance_scale: 9.0,
    quality: "premium",
  },
  toy: {
    name: "3D Toy Caricature",
    prompt: "Cute 3D vinyl toy figurine caricature with oversized head and chibi proportions. Smooth plastic material, playful and friendly expression. Bright solid colors, glossy finish. Designer toy aesthetic with exaggerated kawaii features. Studio product photography lighting on white background.",
    continuation_strength: 0.5,
    guidance_scale: 7.5,
    quality: "premium",
  },
  sticker: {
    name: "Sticker Cutout",
    prompt: "Fun die-cut sticker caricature with bold outlines and flat colors. Simplified features, cheerful expression, slight white border. Vector-style illustration with clean edges. Vibrant pop art colors. Designed for sticker printing with die-cut edge. Playful and iconic style.",
    continuation_strength: 0.55,
    guidance_scale: 8.5,
    quality: "standard",
  },
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
      const { response } = createErrorResponse("Authentication required", 401, 'auth_required', requestId);
      return response;
    }

    // Extract user ID
    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      const { response } = createErrorResponse("Invalid session", 401, 'invalid_session', requestId);
      return response;
    }

    userId = userData.user.id;
    const logger = createLogger(requestId, userId);
    logger.logStart('caricature_image');

    // Parse request body
    const requestBody = await req.json();
    const { image, preset, provider = 'gemini', consent, idempotencyKey } = requestBody;

    console.log(`[${requestId}] Caricature request:`, { preset, provider, hasImage: !!image, consent });

    // CRITICAL: Validate consent
    if (consent !== true) {
      const { response } = createErrorResponse(
        "You must confirm you have rights to transform this image",
        400,
        'consent_required',
        requestId
      );
      return response;
    }

    // Validate preset
    if (!preset || !PRESETS[preset as keyof typeof PRESETS]) {
      const { response } = createErrorResponse(
        `Invalid preset. Must be one of: ${Object.keys(PRESETS).join(', ')}`,
        400,
        'invalid_preset',
        requestId
      );
      return response;
    }

    // Validate image
    if (!image || typeof image !== 'string') {
      const { response } = createErrorResponse("Image is required", 400, 'missing_image', requestId);
      return response;
    }

    // Check idempotency
    if (idempotencyKey) {
      const cached = await checkIdempotency(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        idempotencyKey
      );
      if (cached.cached && cached.response) {
        console.log(`[${requestId}] Returning cached caricature`);
        return new Response(JSON.stringify(cached.response), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check feature access (credits)
    const accessResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/check-feature-access`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'caricature_image' }),
      }
    );

    const accessResult = await accessResponse.json();
    if (!accessResult.allowed) {
      console.log(`[${requestId}] Access denied:`, accessResult.reason);
      const { response } = createErrorResponse(
        accessResult.reason || "Insufficient credits",
        403,
        'insufficient_credits',
        requestId
      );
      return response;
    }

    // Get preset configuration
    const presetConfig = PRESETS[preset as keyof typeof PRESETS];
    console.log(`[${requestId}] Using preset: ${presetConfig.name}`);

    // Call provider to generate caricature
    const providerRequest: ProviderRequest = {
      provider: provider as 'openai' | 'gemini',
      action: 'caricature',
      prompt: presetConfig.prompt,
      image: image,
      options: {
        continuation_strength: presetConfig.continuation_strength,
        guidance_scale: presetConfig.guidance_scale,
        quality: presetConfig.quality,
      },
    };

    const providerResponse = await callProvider(providerRequest, requestId);

    if (!providerResponse.success) {
      const { response } = createErrorResponse(
        providerResponse.error || ERROR_MESSAGES.PROCESSING_FAILED,
        500,
        providerResponse.errorType || 'provider_error',
        requestId
      );
      return response;
    }

    const generatedImageUrl = providerResponse.image || providerResponse.imageUrl;
    if (!generatedImageUrl) {
      const { response } = createErrorResponse(ERROR_MESSAGES.PROCESSING_FAILED, 500, 'no_image', requestId);
      return response;
    }

    console.log(`[${requestId}] Caricature generated, uploading to storage...`);

    // Upload to storage
    let finalImageUrl = generatedImageUrl;
    let assetData = null;

    try {
      const base64Data = generatedImageUrl.split(',')[1];
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const fileName = `${userId}/${Date.now()}-caricature-${preset}.png`;
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('generated-images')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: false,
        });

      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage
          .from('generated-images')
          .getPublicUrl(fileName);
        finalImageUrl = urlData.publicUrl;

        // Save to database
        const { data: savedAsset } = await supabaseAdmin
          .from('generated_assets')
          .insert({
            user_id: userId,
            type: 'image',
            action: 'caricature',
            operation_type: 'caricature',
            image_url: finalImageUrl,
            source_urls: [image],
            model_used: providerResponse.metadata?.model,
            params: {
              preset,
              preset_name: presetConfig.name,
              provider,
              ...presetConfig,
            },
            analysis_data: {
              preset,
              provider,
              generated_at: new Date().toISOString(),
              request_id: requestId,
            },
          })
          .select()
          .single();

        assetData = savedAsset;
      }
    } catch (error) {
      console.error(`[${requestId}] Storage/DB error:`, error);
      // Continue with base64 if storage fails
    }

    const totalDuration = Date.now() - startTime;
    logger.logSuccess('caricature_image', totalDuration, {
      asset_id: assetData?.id,
      preset,
      provider,
    });

    const successResponse = {
      success: true,
      image: finalImageUrl,
      assetId: assetData?.id,
      message: `${presetConfig.name} created successfully`,
      metadata: {
        preset,
        preset_name: presetConfig.name,
        provider,
        ...providerResponse.metadata,
      },
    };

    // Cache response
    if (idempotencyKey) {
      await cacheResponse(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        idempotencyKey,
        successResponse,
        3600
      );
    }

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    const logger = createLogger(requestId, userId);
    logger.logError('caricature_image', error instanceof Error ? error : new Error(String(error)), totalDuration);

    const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.PROCESSING_FAILED;
    const { response } = createErrorResponse(errorMessage, 500, 'server_error', requestId);

    return response;
  }
});
