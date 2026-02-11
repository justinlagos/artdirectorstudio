/**
 * Background Removal Edge Function
 * First-class operation for removing backgrounds from images
 * 
 * Rules:
 * - Accept input image ID or URL
 * - Validate ownership
 * - Validate image type
 * - Run background removal model or API
 * - Output must be alpha PNG or WebP
 * - Store as derivative asset
 * - Persist metadata with operation_type: background_remove
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { validateImageData } from '../_shared/validation.ts';
import { createErrorResponse, mapAIError, ERROR_MESSAGES } from '../_shared/errors.ts';
import { callProvider, getDefaultProvider } from '../_shared/providerClient.ts';
import { fetchWithRetry } from '../_shared/retry.ts';
import { createLogger } from '../_shared/observability.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODEL = 'google/gemini-3-pro-image-preview';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    // Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse("Please sign in to remove backgrounds", 401, 'auth_required', requestId).response;
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return createErrorResponse(
        "Invalid or expired session. Please sign in again.",
        401,
        'invalid_session',
        requestId
      ).response;
    }

    userId = userData.user.id;
    const logger = createLogger(requestId, userId);
    logger.logStart('remove_background');

    // Check feature access
    const accessResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/check-feature-access`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'remove_background' }),
      }
    );

    const accessResult = await accessResponse.json();
    if (!accessResult.allowed) {
      logger.logError('remove_background', new Error(accessResult.reason || 'Access denied'), undefined, { action: 'access_check' });
      return createErrorResponse(
        accessResult.reason || "Access denied. Please upgrade your plan.",
        403,
        'access_denied',
        requestId
      ).response;
    }

    // Parse request body
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      logger.logError('remove_background', parseError instanceof Error ? parseError : new Error('Invalid JSON'), undefined, { action: 'parse_request' });
      return createErrorResponse('Invalid request body. Expected JSON.', 400, 'validation_error', requestId).response;
    }

    const body = requestBody as { image?: string; image_id?: string; method?: 'ai_mask' | 'chroma' | 'hybrid' };
    const { image, image_id, method = 'ai_mask' } = body;

    // Validate input - must have either image data or image_id
    if (!image && !image_id) {
      logger.logError('remove_background', new Error('Missing image or image_id'), undefined, { action: 'validate_input' });
      return createErrorResponse('Either image (base64 data URI) or image_id is required', 400, 'validation_error', requestId).response;
    }

    let inputImageUrl: string;
    let sourceAssetId: string | null = null;

    // If image_id provided, fetch and validate ownership
    if (image_id) {
      const { data: sourceAsset, error: assetError } = await supabaseAdmin
        .from('generated_assets')
        .select('id, image_url, user_id')
        .eq('id', image_id)
        .single();

      if (assetError || !sourceAsset) {
        logger.logError('remove_background', new Error('Source asset not found'), undefined, { action: 'fetch_source', image_id });
        return createErrorResponse('Source image not found', 404, 'not_found', requestId).response;
      }

      if (sourceAsset.user_id !== userId) {
        logger.logError('remove_background', new Error('Unauthorized access to asset'), undefined, { action: 'ownership_check', image_id });
        return createErrorResponse('Unauthorized access to this image', 403, 'unauthorized', requestId).response;
      }

      inputImageUrl = sourceAsset.image_url;
      sourceAssetId = sourceAsset.id;
    } else if (image) {
      // Validate image data
      const imageValidation = validateImageData(image);
      if (!imageValidation.valid) {
        logger.logError('remove_background', new Error(imageValidation.error || 'Invalid image'), undefined, { action: 'validate_image' });
        return createErrorResponse(imageValidation.error || 'Invalid image data', 400, 'validation_error', requestId).response;
      }
      inputImageUrl = image;
    } else {
      return createErrorResponse('Either image or image_id is required', 400, 'validation_error', requestId).response;
    }

    const provider = getDefaultProvider();
    const hasKey = provider === 'gemini' ? !!Deno.env.get('GOOGLE_AI_API_KEY') : !!Deno.env.get('OPENAI_API_KEY');
    if (!hasKey) {
      logger.logError('remove_background', new Error(`${provider === 'gemini' ? 'GOOGLE_AI_API_KEY' : 'OPENAI_API_KEY'} not configured`), undefined, { action: 'config_check' });
      return createErrorResponse('AI service not configured. Set GOOGLE_AI_API_KEY (or OPENAI_API_KEY) in Edge Function secrets.', 500, 'config_error', requestId).response;
    }

    const removalPrompt = method === 'ai_mask'
      ? 'Remove the background from this image completely. Create a perfect transparent background with clean edges, no halos, no artifacts, and no background remnants. The subject should be isolated perfectly with smooth, natural edges.'
      : method === 'chroma'
      ? 'Remove the background using chroma key techniques. Create a transparent background with clean edges.'
      : 'Remove the background using a hybrid approach combining AI masking and chroma key. Create a perfect transparent background with clean edges and no artifacts.';

    logger.log('remove_background', 'api_call_start', {
      method,
      provider,
      has_source_asset: !!sourceAssetId,
      image_url_length: inputImageUrl.length,
    });

    const aiCallStart = Date.now();
    const providerResponse = await callProvider(
      {
        provider,
        action: 'generate',
        prompt: removalPrompt,
        image: inputImageUrl,
        options: { temperature: 0.7, maxTokens: 2048 },
      },
      requestId
    );

    if (!providerResponse.success || !providerResponse.image) {
      const aiCallDuration = Date.now() - aiCallStart;
      logger.logError('remove_background', new Error(providerResponse.error || 'No image'), aiCallDuration, { action: 'api_error' });
      return createErrorResponse(
        providerResponse.error || ERROR_MESSAGES.PROCESSING_FAILED,
        providerResponse.errorType === 'rate_limit' ? 429 : 500,
        providerResponse.errorType || 'ai_error',
        requestId
      ).response;
    }

    const aiCallDuration = Date.now() - aiCallStart;
    const resultImageUrl = providerResponse.image;

    logger.log('remove_background', 'api_success', {
      duration_ms: aiCallDuration,
      image_length: resultImageUrl.length,
    });

    // Upload to storage
    let finalImageUrl = resultImageUrl;
    let assetData = null;

    try {
      if (resultImageUrl.startsWith('data:image/')) {
        const base64Data = resultImageUrl.split(',')[1];
        if (!base64Data) {
          throw new Error('No base64 data found');
        }

        const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const fileName = `${userId}/${Date.now()}-background-removed.png`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('generated-images')
          .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          logger.logError('remove_background', new Error(uploadError.message), undefined, { action: 'storage_upload' });
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        const { data: urlData } = supabaseAdmin.storage
          .from('generated-images')
          .getPublicUrl(fileName);

        if (!urlData?.publicUrl) {
          throw new Error('Failed to get public URL');
        }

        finalImageUrl = urlData.publicUrl;
      }

      // Save metadata
      const duration = Date.now() - startTime;
      const { data: savedAsset, error: assetError } = await supabaseAdmin
        .from('generated_assets')
        .insert({
          user_id: userId,
          type: 'image',
          action: 'background_remove',
          operation_type: 'background_remove',
          image_url: finalImageUrl,
          prompt: `Background removed using ${method} method`,
          source_asset_id: sourceAssetId,
          source_urls: sourceAssetId ? [inputImageUrl] : null,
          model_used: MODEL,
          params: {
            method,
            operation: 'background_remove',
          },
          analysis_data: {
            operation_type: 'background_remove',
            method,
            confidence_score: null, // Could be added if AI provides it
            processed_at: new Date().toISOString(),
            request_id: requestId
          }
        })
        .select()
        .single();

      if (assetError) {
        logger.logError('remove_background', new Error(assetError.message), undefined, { action: 'database_save' });
        // Non-fatal - image is still valid
      } else if (savedAsset) {
        assetData = savedAsset;
      }
    } catch (error) {
      logger.logError('remove_background', error instanceof Error ? error : new Error(String(error)), undefined, { action: 'save_result' });
      // Continue - image is still valid
    }

    const totalDuration = Date.now() - startTime;
    logger.logSuccess('remove_background', totalDuration, {
      asset_id: assetData?.id,
      method,
      has_source: !!sourceAssetId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        image: finalImageUrl,
        assetId: assetData?.id,
        method,
        message: "Background removed successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    const logger = createLogger(requestId, userId);
    logger.logError('remove_background', error instanceof Error ? error : new Error(String(error)), totalDuration);

    return createErrorResponse(
      error instanceof Error ? error.message : ERROR_MESSAGES.PROCESSING_FAILED,
      500,
      'server_error',
      requestId,
      { duration: totalDuration }
    ).response;
  }
});
