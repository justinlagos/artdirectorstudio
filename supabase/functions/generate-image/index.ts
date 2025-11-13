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

    // Parse request body
    const { 
      prompt, 
      quality = 'auto', 
      size = '1024x1024', 
      background = 'auto', 
      referenceImageUrl,
      continuationStrength = 1.0,
      previousPrompt
    } = await req.json();
    
    console.log(`[${requestId}] Request params:`, { 
      promptLength: prompt?.length, 
      quality, 
      size, 
      background,
      hasReference: !!referenceImageUrl,
      continuationStrength,
      hasPreviousPrompt: !!previousPrompt
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
        'validation_error',
        requestId
      );
      return response;
    }

    if (typeof prompt !== 'string') {
      console.error(`[${requestId}] Invalid prompt type`);
      const { response } = createErrorResponse(
        ERROR_MESSAGES.INVALID_INPUT,
        400,
        'validation_error',
        requestId
      );
      return response;
    }

    if (prompt.length < 3) {
      console.error(`[${requestId}] Prompt too short: ${prompt.length} characters`);
      const { response } = createErrorResponse(
        "Prompt too short. Please provide at least 3 characters describing what you want to generate.",
        400,
        'validation_error',
        requestId,
        { promptLength: prompt.length }
      );
      return response;
    }

    if (prompt.length > 2000) {
      console.error(`[${requestId}] Prompt too long: ${prompt.length} characters`);
      const { response } = createErrorResponse(
        `Prompt too long (${prompt.length} characters). Maximum 2000 characters allowed. Try being more concise.`,
        400,
        'validation_error',
        requestId,
        { promptLength: prompt.length }
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
        'config_error',
        requestId
      );
      return response;
    }

    // Call Lovable AI Gateway with Nano banana model
    const aiCallStart = Date.now();
    console.log(`[${requestId}] Calling AI API with model: google/gemini-2.5-flash-image-preview`);
    
    // Build message content with context preservation
    let messageContent: any;
    
    if (referenceImageUrl) {
      console.log(`[${requestId}] Using reference image for context: ${referenceImageUrl.substring(0, 50)}...`);
      console.log(`[${requestId}] Continuation strength: ${continuationStrength} (${continuationStrength <= 0.3 ? 'high continuity' : continuationStrength <= 0.6 ? 'moderate' : continuationStrength <= 0.8 ? 'major change' : 'fresh'})`);
      
      // Adjust instructions based on continuation strength
      let contextInstructions = '';
      if (continuationStrength <= 0.3) {
        // High continuity - minor edits only
        contextInstructions = `CRITICAL: This is a MINOR REFINEMENT. Preserve nearly everything from the reference image.
1. Keep the EXACT same subject, composition, framing, and perspective
2. Maintain the EXACT same artistic style, technique, and mood
3. Preserve the EXACT same color palette and lighting setup
4. Only make MINIMAL changes as explicitly mentioned: ${prompt}
5. If unclear what to change, keep everything identical to the reference`;
      } else if (continuationStrength <= 0.6) {
        // Moderate - balance preservation and change
        contextInstructions = `IMPORTANT: This is a MODERATE REFINEMENT. Balance preservation with intentional changes.
1. Keep the core subject, general composition, and framing
2. Maintain the overall artistic style and mood
3. Preserve the general color palette unless explicitly changed
4. Apply these specific changes while keeping context: ${prompt}
5. Ensure changes feel natural and cohesive with the original`;
      } else if (continuationStrength <= 0.8) {
        // Major - significant changes but maintain some context
        contextInstructions = `NOTE: This is a MAJOR REVISION. Make significant changes while maintaining some visual connection.
1. Transform based on: ${prompt}
2. You may alter composition, style, and colors as needed
3. Keep some recognizable elements from the reference if appropriate
4. Prioritize the new vision while honoring the reference's essence`;
      } else {
        // Fresh - minimal constraint
        contextInstructions = `This is a FRESH GENERATION inspired by the reference.
Create: ${prompt}
Use the reference image only as loose inspiration for general style or mood, but feel free to create something entirely new.`;
      }
      
      const contextPrompt = `${contextInstructions}

Aspect ratio: ${aspectRatio}

${previousPrompt ? `Previous prompt was: "${previousPrompt}"` : ''}`;

      messageContent = [
        {
          type: "text",
          text: contextPrompt
        },
        {
          type: "image_url",
          image_url: {
            url: referenceImageUrl
          }
        }
      ];
    } else {
      messageContent = `Generate an image with aspect ratio ${aspectRatio}. ${prompt}`;
    }
    
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
              prompt: prompt,
              image_url: finalImageUrl,
              source_urls: referenceImageUrl ? [referenceImageUrl] : null,
              params: {
                quality, 
                size, 
                background,
                continuationStrength: referenceImageUrl ? continuationStrength : undefined,
                hadReference: !!referenceImageUrl
              },
              analysis_data: {
                generation_params: { quality, size, background },
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
});