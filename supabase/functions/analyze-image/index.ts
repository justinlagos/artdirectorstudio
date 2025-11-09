import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateImageData } from '../_shared/validation.ts';
import { checkIdempotency, cacheResponse } from '../_shared/idempotency.ts';
import { createErrorResponse, mapAIError, ERROR_MESSAGES } from '../_shared/errors.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

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

    // Check feature access before processing
    const accessResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/check-feature-access`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'analyze_image' }),
    });

    const accessResult = await accessResponse.json();
    
    if (!accessResult.allowed) {
      console.log(JSON.stringify({
        requestId,
        action: 'access_denied',
        reason: accessResult.reason,
        timestamp: new Date().toISOString()
      }));
      const { response } = createErrorResponse(
        accessResult.reason || ERROR_MESSAGES.INVALID_INPUT,
        403,
        'access_denied',
        requestId,
        { tier: accessResult.tier }
      );
      return response;
    }

    console.log(JSON.stringify({
      requestId,
      action: 'access_granted',
      tier: accessResult.tier,
      timestamp: new Date().toISOString()
    }));

    const { image, idempotencyKey } = await req.json();
    
    // Input validation
    const validation = validateImageData(image);
    if (!validation.valid) {
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error(JSON.stringify({
        requestId,
        action: 'config_error',
        timestamp: new Date().toISOString()
      }));
      const { response } = createErrorResponse(
        "AI service not configured",
        500,
        'config_error',
        requestId
      );
      return response;
    }

    console.log(JSON.stringify({
      requestId,
      action: 'ai_call_start',
      timestamp: new Date().toISOString()
    }));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a professional image analysis AI that creates comprehensive creative briefs for image reconstruction.

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
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image across all 12 categories with professional-level detail. Return ONLY the JSON object, no markdown formatting, no extra text.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(JSON.stringify({
        requestId,
        action: 'ai_error',
        status: response.status,
        error: errorText.substring(0, 500),
        timestamp: new Date().toISOString()
      }));

      const errorMessage = mapAIError(response.status, errorText);
      const { response: errorResponse } = createErrorResponse(
        errorMessage,
        response.status,
        response.status === 429 ? 'rate_limit' : 'ai_error',
        requestId,
        { aiStatus: response.status }
      );
      return errorResponse;
    }

    const data = await response.json();
    console.log(JSON.stringify({
      requestId,
      action: 'ai_response_received',
      timestamp: new Date().toISOString()
    }));
    
    const messageContent = data.choices?.[0]?.message?.content;
    
    if (!messageContent) {
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

    return new Response(
      JSON.stringify(analysisData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown';
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
