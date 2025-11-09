import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { fetchWithRetry } from '../_shared/retry.ts';
import { createErrorResponse, mapAIError, ERROR_MESSAGES } from '../_shared/errors.ts';
import { checkIdempotency, cacheResponse } from '../_shared/idempotency.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  try {
    console.log(`[${requestId}] Generation request started`);
    
    // Extract and validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[${requestId}] No authorization header`);
      const { response } = createErrorResponse(
        "Please sign in to generate images",
        401,
        'auth_required'
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
        'invalid_session'
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
      { maxRetries: 1, delayMs: 1000, timeoutMs: 10000 }
    );

    const accessResult = await accessResponse.json();
    
    if (!accessResult.allowed) {
      console.log(`[${requestId}] Access denied:`, accessResult.reason);
      const { response } = createErrorResponse(
        accessResult.reason || "Access denied. Please upgrade your plan.",
        403,
        'access_denied'
      );
      return response;
    }

    console.log(`[${requestId}] Access granted: ${accessResult.tier}`);

    // Parse request body
    const { prompt, quality = 'auto', size = '1024x1024', background = 'auto' } = await req.json();
    
    console.log(`[${requestId}] Request params:`, { 
      promptLength: prompt?.length, 
      quality, 
      size, 
      background 
    });
    
    // Parse size dimensions
    let aspectRatio = '1:1'; // Default square
    if (size === '1536x1024') {
      aspectRatio = '3:2'; // Landscape
    } else if (size === '1024x1536') {
      aspectRatio = '2:3'; // Portrait
    }
    
    // Validate prompt
    if (!prompt) {
      console.error(`[${requestId}] Missing prompt`);
      const { response } = createErrorResponse(
        "Prompt is required to generate an image",
        400,
        'validation_error'
      );
      return response;
    }

    if (typeof prompt !== 'string') {
      console.error(`[${requestId}] Invalid prompt type`);
      const { response } = createErrorResponse(
        ERROR_MESSAGES.INVALID_INPUT,
        400,
        'validation_error'
      );
      return response;
    }

    if (prompt.length < 3) {
      console.error(`[${requestId}] Prompt too short: ${prompt.length} characters`);
      const { response } = createErrorResponse(
        "Prompt too short. Please provide at least 3 characters describing what you want to generate.",
        400,
        'validation_error'
      );
      return response;
    }

    if (prompt.length > 2000) {
      console.error(`[${requestId}] Prompt too long: ${prompt.length} characters`);
      const { response } = createErrorResponse(
        `Prompt too long (${prompt.length} characters). Maximum 2000 characters allowed. Try being more concise.`,
        400,
        'validation_error'
      );
      return response;
    }

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error(`[${requestId}] LOVABLE_API_KEY not configured`);
      const { response } = createErrorResponse(
        "AI service not configured. Please contact support.",
        500,
        'config_error'
      );
      return response;
    }

    // Call Lovable AI Gateway with Nano banana model
    const aiCallStart = Date.now();
    console.log(`[${requestId}] Calling AI API with model: google/gemini-2.5-flash-image-preview`);
    const aiResponse = await fetchWithRetry(
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
              content: `Generate an image with aspect ratio ${aspectRatio}. ${prompt}`
            }
          ],
          modalities: ["image", "text"]
        }),
      },
      { maxRetries: 2, delayMs: 2000, timeoutMs: 60000 }
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
        'ai_error'
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
        'no_image_data'
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
        throw uploadError;
      }

      const storageDuration = Date.now() - storageStart;
      console.log(`[${requestId}] Storage upload complete (${storageDuration}ms)`);

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('generated-images')
        .getPublicUrl(fileName);
      finalImageUrl = urlData.publicUrl;

      // Save metadata to database
      const dbStart = Date.now();
      const { data: savedAsset, error: assetError } = await supabaseAdmin
        .from('generated_assets')
        .insert({
          user_id: userId,
          type: 'image',
          prompt: prompt,
          image_url: finalImageUrl,
          analysis_data: {
            generation_params: { quality, size, background },
            generated_at: new Date().toISOString(),
            request_id: requestId
          }
        })
        .select()
        .single();

      if (assetError) {
        console.error(`[${requestId}] Database save error:`, assetError);
        throw assetError;
      }

      const dbDuration = Date.now() - dbStart;
      assetData = savedAsset;
      console.log(`[${requestId}] Database save complete (${dbDuration}ms): ${assetData.id}`);
    } catch (error) {
      console.error(`[${requestId}] Failed to save image:`, error);
      const { response } = createErrorResponse(
        "Failed to save generated image. Please try again.",
        500,
        'storage_error'
      );
      return response;
    }

    const totalDuration = Date.now() - startTime;
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
    console.error(`[${requestId}] Error in generate-image function (${totalDuration}ms):`, error);
    
    const { response } = createErrorResponse(
      error instanceof Error ? error.message : ERROR_MESSAGES.PROCESSING_FAILED,
      500,
      'server_error'
    );
    return response;
  }
});