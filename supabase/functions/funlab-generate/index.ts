/**
 * Fun Lab Generate — Generates exactly 3 image variants from pack prompt templates.
 *
 * Architecture decision: New dedicated function rather than extending generate-image.
 * Reason: generate-image is SSE-streaming oriented for single-image generation
 * with complex prompt engine pipeline. Fun Lab needs batch-of-3, no streaming,
 * and simpler prompt passthrough. Keeping them separate avoids bloating generate-image
 * with batch logic and keeps each function focused.
 *
 * The existing caricature-image function is preserved for backward compatibility;
 * new Fun Lab caricature packs route through this function instead.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { callProvider, type ProviderRequest } from '../_shared/providerClient.ts';
import { createErrorResponse, ERROR_MESSAGES } from '../_shared/errors.ts';
import { createLogger } from '../_shared/observability.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function commitReservation(authHeader: string, reservationId: string, action: 'commit' | 'refund') {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/commit-credits`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reservation_id: reservationId, action }),
  });
}

async function validateReservation(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  reservationId: string | undefined
): Promise<{ valid: boolean }> {
  if (!reservationId || typeof reservationId !== 'string') return { valid: false };
  const { data: row, error } = await supabaseAdmin
    .from('credit_transactions')
    .select('id, user_id, status, expires_at')
    .eq('id', reservationId)
    .single();
  if (error || !row || row.user_id !== userId || row.status !== 'pending') return { valid: false };
  const now = new Date().toISOString();
  if (row.expires_at && row.expires_at <= now) return { valid: false };
  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  let userId = 'unknown';

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      const { response } = createErrorResponse("Authentication required", 401, 'auth_required', requestId);
      return response;
    }

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
    logger.logStart('funlab_generate');

    // Parse body
    const body = await req.json();
    const {
      pack_id,
      variant_prompts,
      source_image_url,
      pack_controls,
      reservation_id,
    } = body;

    console.log(`[${requestId}] Fun Lab request: pack=${pack_id}, hasImage=${!!source_image_url}`);

    // Validate inputs
    if (!pack_id || typeof pack_id !== 'string') {
      const { response } = createErrorResponse("pack_id is required", 400, 'invalid_input', requestId);
      return response;
    }

    if (!Array.isArray(variant_prompts) || variant_prompts.length !== 3) {
      const { response } = createErrorResponse("Exactly 3 variant_prompts required", 400, 'invalid_input', requestId);
      return response;
    }

    if (!source_image_url || typeof source_image_url !== 'string') {
      const { response } = createErrorResponse("source_image_url is required", 400, 'invalid_input', requestId);
      return response;
    }

    // Validate reservation
    const { valid } = await validateReservation(supabaseAdmin, userId, reservation_id);
    if (!valid) {
      const { response } = createErrorResponse("Invalid or expired credit reservation", 402, 'invalid_reservation', requestId);
      return response;
    }

    // Generate all 3 variants
    const results: Array<{ url: string; thumbnail_url: string }> = [];
    let failures = 0;

    for (let i = 0; i < 3; i++) {
      const prompt = variant_prompts[i];
      console.log(`[${requestId}] Generating variant ${i + 1}/3`);

      try {
        const providerRequest: ProviderRequest = {
          provider: 'gemini',
          action: 'generate',
          prompt: prompt,
          image: source_image_url,
          options: {
            quality: 'standard',
          },
        };

        const providerResponse = await callProvider(providerRequest, requestId);

        if (!providerResponse.success || (!providerResponse.image && !providerResponse.imageUrl)) {
          console.error(`[${requestId}] Variant ${i + 1} provider error:`, providerResponse.error);
          failures++;
          continue;
        }

        const generatedImageData = providerResponse.image || providerResponse.imageUrl;

        // Upload to storage
        let finalUrl = generatedImageData!;
        let thumbnailUrl = generatedImageData!;

        try {
          // Handle base64 or URL
          let buffer: Uint8Array;
          if (generatedImageData!.startsWith('data:')) {
            const base64Data = generatedImageData!.split(',')[1];
            buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          } else {
            // Fetch the image from URL
            const imgResp = await fetch(generatedImageData!);
            const arrBuf = await imgResp.arrayBuffer();
            buffer = new Uint8Array(arrBuf);
          }

          const fileName = `${userId}/${Date.now()}-funlab-${pack_id}-v${i + 1}.png`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from('generated-images')
            .upload(fileName, buffer, { contentType: 'image/png', upsert: false });

          if (!uploadError) {
            const { data: urlData } = supabaseAdmin.storage
              .from('generated-images')
              .getPublicUrl(fileName);
            finalUrl = urlData.publicUrl;
            thumbnailUrl = urlData.publicUrl;
          }
        } catch (storageErr) {
          console.error(`[${requestId}] Storage error for variant ${i + 1}:`, storageErr);
          // Continue with original URL
        }

        // Save to generated_assets
        try {
          await supabaseAdmin
            .from('generated_assets')
            .insert({
              user_id: userId,
              type: 'image',
              action: 'funlab',
              operation_type: 'funlab',
              image_url: finalUrl,
              source_urls: [source_image_url],
              params: {
                pack_id,
                variant_index: i,
                pack_controls,
              },
              analysis_data: {
                pack_id,
                variant_index: i,
                generated_at: new Date().toISOString(),
                request_id: requestId,
              },
            });
        } catch (dbErr) {
          console.error(`[${requestId}] DB error saving asset ${i + 1}:`, dbErr);
          // Non-fatal: continue
        }

        results.push({ url: finalUrl, thumbnail_url: thumbnailUrl });
      } catch (variantErr) {
        console.error(`[${requestId}] Variant ${i + 1} failed:`, variantErr);
        failures++;
      }
    }

    // Canon rule: exactly 3 outputs or refund. No partial commits.
    if (results.length !== 3) {
      console.log(`[${requestId}] Only ${results.length}/3 succeeded, refunding (canon: exactly 3 or refund)`);
      await commitReservation(authHeader, reservation_id, 'refund');
      const { response } = createErrorResponse(
        `Generation incomplete: ${results.length}/3 succeeded. Credits refunded.`,
        500,
        'generation_incomplete',
        requestId
      );
      return response;
    }

    // All 3 succeeded → commit
    console.log(`[${requestId}] 3/3 succeeded, committing`);
    await commitReservation(authHeader, reservation_id, 'commit');

    const totalDuration = Date.now() - startTime;
    logger.logSuccess('funlab_generate', totalDuration, {
      pack_id,
      success_count: results.length,
      failure_count: failures,
    });

    return new Response(
      JSON.stringify({
        success: true,
        results,
        failures: failures > 0 ? failures : undefined,
        message: failures > 0
          ? `${results.length} of 3 options generated successfully`
          : '3 options ready',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    const logger = createLogger(requestId, userId);
    logger.logError('funlab_generate', error instanceof Error ? error : new Error(String(error)), totalDuration);

    const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.PROCESSING_FAILED;
    const { response } = createErrorResponse(errorMessage, 500, 'server_error', requestId);
    return response;
  }
});
