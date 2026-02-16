import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateImageData } from '../_shared/validation.ts';
import { checkIdempotency, cacheResponse } from '../_shared/idempotency.ts';
import { createErrorResponse, mapAIError, ERROR_MESSAGES } from '../_shared/errors.ts';
import { chatWithProvider, getDefaultProvider } from '../_shared/providerClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const ANALYZE_CREDITS_COST = 3;

async function commitReservation(authHeader: string, reservationId: string, action: 'commit' | 'refund') {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/commit-credits`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reservation_id: reservationId, action }),
  });
}

type ReservationAcquireResult =
  | { ok: true; reservationId: string }
  | {
      ok: false;
      status: number;
      error: string;
      available?: number;
      required?: number;
    };

async function reserveCredits(
  authHeader: string,
  amount: number,
  action: string,
  description: string
): Promise<ReservationAcquireResult> {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/reserve-credits`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, action, description }),
  });

  const payload = await response.json().catch(() => null);

  if (payload?.reserved && typeof payload?.reservation_id === 'string') {
    return { ok: true, reservationId: payload.reservation_id };
  }

  if (payload?.reserved === false) {
    return {
      ok: false,
      status: 402,
      error: payload?.error || 'Insufficient credits',
      available: typeof payload?.available === 'number' ? payload.available : undefined,
      required: typeof payload?.required === 'number' ? payload.required : amount,
    };
  }

  return {
    ok: false,
    status: response.status || 500,
    error: payload?.error || `Failed to reserve credits (${response.status})`,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  let reservationIdForRefund: string | undefined;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(JSON.stringify({
        requestId,
        action: 'auth_missing',
        timestamp: new Date().toISOString()
      }));
      const { response } = createErrorResponse(
        ERROR_MESSAGES.INVALID_INPUT,
        401,
        'auth_required',
        requestId
      );
      return response;
    }

    // Extract and decode JWT to get user ID
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error(JSON.stringify({
        requestId,
        action: 'invalid_token',
        timestamp: new Date().toISOString()
      }));
      const { response } = createErrorResponse(
        "Invalid token format",
        401,
        'invalid_token',
        requestId
      );
      return response;
    }

    const payload = JSON.parse(atob(parts[1]));
    const userId = payload.sub;
    
    if (!userId) {
      console.error(JSON.stringify({
        requestId,
        action: 'no_user_id',
        timestamp: new Date().toISOString()
      }));
      const { response } = createErrorResponse(
        "Invalid token: no user ID",
        401,
        'no_user_id',
        requestId
      );
      return response;
    }

    console.log(JSON.stringify({
      requestId,
      action: 'analyze_start',
      userId,
      timestamp: new Date().toISOString()
    }));

    let body: { image?: string; idempotencyKey?: string; reservation_id?: string };
    try {
      body = await req.json();
    } catch {
      const { response } = createErrorResponse("Invalid JSON body", 400, 'validation_error', requestId);
      return response;
    }

    let reservation_id = typeof body.reservation_id === 'string' ? body.reservation_id : undefined;
    if (!reservation_id) {
      console.warn(JSON.stringify({
        requestId,
        action: 'missing_reservation_auto_acquire',
        userId,
        timestamp: new Date().toISOString()
      }));
      const acquired = await reserveCredits(authHeader, ANALYZE_CREDITS_COST, 'analyze', 'Analyze image');
      if (!acquired.ok) {
        const status = acquired.status === 402 ? 402 : acquired.status >= 400 ? acquired.status : 500;
        const errorType = status === 402 ? 'insufficient_credits' : 'reservation_error';
        const details: Record<string, unknown> = {};
        if (typeof acquired.available === 'number') details.available = acquired.available;
        if (typeof acquired.required === 'number') details.required = acquired.required;

        const message =
          status === 402 && typeof acquired.available === 'number' && typeof acquired.required === 'number'
            ? `Insufficient credits: ${acquired.available} available, ${acquired.required} needed`
            : acquired.error;
        const { response } = createErrorResponse(message, status, errorType, requestId, details);
        return response;
      }
      reservation_id = acquired.reservationId;
    }
    const activeReservationId = reservation_id;
    if (!activeReservationId) {
      const { response } = createErrorResponse("Failed to reserve credits", 500, 'reservation_error', requestId);
      return response;
    }
    reservationIdForRefund = activeReservationId;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: reservation, error: resErr } = await supabaseAdmin
      .from('credit_transactions')
      .select('id, user_id, status, expires_at')
      .eq('id', activeReservationId)
      .single();

    if (resErr || !reservation || reservation.user_id !== userId || reservation.status !== 'pending') {
      const { response } = createErrorResponse(
        'Invalid or expired reservation',
        402,
        'invalid_reservation',
        requestId
      );
      return response;
    }
    const now = new Date().toISOString();
    if (reservation.expires_at && reservation.expires_at <= now) {
      const { response } = createErrorResponse(
        'Reservation expired',
        402,
        'invalid_reservation',
        requestId
      );
      return response;
    }

    const { image, idempotencyKey } = body;
    
    // Input validation
    const validation = validateImageData(image);
    if (!validation.valid) {
      await commitReservation(authHeader, activeReservationId, 'refund');
      console.error(JSON.stringify({
        requestId,
        action: 'validation_failed',
        error: validation.error,
        timestamp: new Date().toISOString()
      }));
      const { response } = createErrorResponse(
        validation.error!,
        400,
        'validation_error',
        requestId
      );
      return response;
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
          JSON.stringify(cached.response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const provider = getDefaultProvider();
    const hasKey = provider === 'gemini' ? !!Deno.env.get('GOOGLE_AI_API_KEY') : !!Deno.env.get('OPENAI_API_KEY');
    if (!hasKey) {
      const { response } = createErrorResponse(
        "AI service not configured. Set GOOGLE_AI_API_KEY (or OPENAI_API_KEY) in Edge Function secrets.",
        500,
        'config_error',
        requestId
      );
      return response;
    }

    const systemPrompt = `You are a professional image analysis AI that creates comprehensive creative briefs for image reconstruction.

Analyze the uploaded image in extreme detail across 12 professional categories. Be specific, technical, and actionable.

CRITICAL: You MUST respond with ONLY a valid JSON object. Do not include any markdown formatting, code blocks, or explanatory text.

Rules for JSON output:
1. Use only straight double quotes (") for strings, never curved quotes
2. Do not use newlines inside string values - use spaces instead
3. Do not use trailing commas
4. Escape any special characters in strings
5. Keep each field value as a single continuous string

Respond with ONLY this exact JSON structure:
{
  "full_regeneration_prompt": "A comprehensive 150-200 word single-paragraph prompt suitable for Midjourney or DALL-E. Keep it all in one line with no line breaks.",
  "analysis": {
    "image_overview": "High-level technical description of image quality and production method",
    "subject_description": "Detailed description of the main subject including physical features, clothing, pose, expression",
    "camera_composition": "Camera type, lens, framing, angle, and compositional approach",
    "lighting": "Lighting setup, type, position, mood, and technical details",
    "color_palette": "Dominant colors, secondary colors, accents, and color relationships",
    "design_style": "Visual style, design influences, aesthetic approach",
    "texture_material": "Physical textures and materials visible in the image",
    "mood_emotion": "Emotional tone, atmosphere, and feeling conveyed",
    "background_environment": "Background description, environment type, and spatial context",
    "artistic_medium": "Production medium and optional alternative interpretations",
    "art_direction_influence": "Creative direction, visual influences, and cultural references",
    "intended_use": "Recommended applications and platforms"
  }
}`;

    const chatResult = await chatWithProvider(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this image across all 12 categories with professional-level detail. Return ONLY the JSON object, no markdown formatting, no extra text.' },
            { type: 'image_url', image_url: { url: image } },
          ],
        },
      ],
      { model: provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o', requestId }
    );

    if (!chatResult.success || !chatResult.text) {
      await commitReservation(authHeader, activeReservationId, 'refund');
      
      const details: Record<string, unknown> = {};
      if (chatResult.providerStatus) {
        details.provider_status = chatResult.providerStatus;
      }
      if (chatResult.providerMessage) {
        details.provider_message = chatResult.providerMessage;
      }
      
      const { response: errorResponse } = createErrorResponse(
        chatResult.error || ERROR_MESSAGES.PROCESSING_FAILED,
        500,
        chatResult.errorType || 'ai_error',
        requestId,
        Object.keys(details).length > 0 ? details : undefined
      );
      return errorResponse;
    }

    const messageContent = chatResult.text;
    
    if (!messageContent) {
      await commitReservation(authHeader, activeReservationId, 'refund');
      console.error(JSON.stringify({
        requestId,
        action: 'no_content',
        timestamp: new Date().toISOString()
      }));
      const { response } = createErrorResponse(
        "Invalid AI response - no content returned",
        500,
        'no_content',
        requestId
      );
      return response;
    }

    // Parse the JSON from the AI response
    let analysisData;
    try {
      let cleanContent = messageContent;
      
      // Log first 500 chars for debugging
      console.log(JSON.stringify({
        requestId,
        action: 'raw_response_preview',
        content: messageContent.substring(0, 500),
        length: messageContent.length,
        timestamp: new Date().toISOString()
      }));
      
      // Remove markdown code blocks
      cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/\n?```/g, '');
      
      // Try to find JSON object in the content
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      // Additional sanitization
      cleanContent = cleanContent
        .trim()
        // Fix common JSON issues from AI responses
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/\n/g, ' ') // Replace newlines in strings with spaces
        .replace(/\r/g, ''); // Remove carriage returns
      
      console.log(JSON.stringify({
        requestId,
        action: 'cleaned_json_preview',
        content: cleanContent.substring(0, 500),
        timestamp: new Date().toISOString()
      }));
      
      analysisData = JSON.parse(cleanContent);
      
      // Validate the structure
      if (!analysisData.full_regeneration_prompt || !analysisData.analysis) {
        throw new Error("Missing required fields in response");
      }
      
      console.log(JSON.stringify({
        requestId,
        action: 'parse_success',
        hasPrompt: !!analysisData.full_regeneration_prompt,
        hasAnalysis: !!analysisData.analysis,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown';
      console.error(JSON.stringify({
        requestId,
        action: 'parse_failed',
        error: errorMessage,
        contentLength: messageContent?.length || 0,
        timestamp: new Date().toISOString()
      }));
      
      await commitReservation(authHeader, activeReservationId, 'refund');
      const { response } = createErrorResponse(
        "Failed to parse AI analysis. The AI returned malformed data. Please try again.",
        500,
        'parse_error',
        requestId,
        { parseError: errorMessage }
      );
      return response;
    }

    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      requestId,
      action: 'analyze_success',
      duration,
      userId,
      timestamp: new Date().toISOString()
    }));

    // Cache response for idempotency
    if (idempotencyKey) {
      await cacheResponse(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        idempotencyKey,
        analysisData
      );
    }

    await commitReservation(authHeader, activeReservationId, 'commit');

    return new Response(
      JSON.stringify(analysisData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown';
    if (reservationIdForRefund && req.headers.get('Authorization')) {
      await commitReservation(req.headers.get('Authorization')!, reservationIdForRefund, 'refund').catch(() => {});
    }
    console.error(JSON.stringify({
      requestId,
      action: 'analyze_error',
      error: errorMessage,
      duration,
      timestamp: new Date().toISOString()
    }));
    const { response } = createErrorResponse(
      ERROR_MESSAGES.PROCESSING_FAILED,
      500,
      'server_error',
      requestId,
      { duration, error: errorMessage }
    );
    return response;
  }
});
