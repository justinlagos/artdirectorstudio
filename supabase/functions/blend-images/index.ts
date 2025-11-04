import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  corsHeaders,
  handleCorsPreflightRequest,
  createErrorResponse,
  createSuccessResponse,
  generateCorrelationId,
  validateEnvVars,
  extractUserIdFromJWT,
  fetchWithTimeout,
  retryWithBackoff,
  isRetryableError,
  logRequest,
} from "../_shared/edgeFunctionUtils.ts";

const BLEND_COST = 2;

serve(async (req) => {
  const correlationId = generateCorrelationId();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    logRequest(req.method, '/blend-images', correlationId);
    
    // Validate required environment variables
    validateEnvVars(['LOVABLE_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], correlationId);

    // Extract user ID from JWT
    const userId = extractUserIdFromJWT(req.headers.get('Authorization'), correlationId);

    const { images, instruction, request_id } = await req.json();
    const requestId = request_id || correlationId;
    
    console.log(`[${correlationId}] [RequestID:${requestId}] User ${userId} blending ${images?.length} images`);

    // Validate input
    if (!images || !Array.isArray(images) || images.length < 2) {
      return createErrorResponse(
        new Error('At least 2 images are required for blending'),
        correlationId,
        400,
        'INVALID_INPUT'
      );
    }

    if (images.length > 4) {
      return createErrorResponse(
        new Error('Maximum 4 images can be blended at once'),
        correlationId,
        400,
        'TOO_MANY_IMAGES'
      );
    }

    // ATOMIC CREDIT TRANSACTION - Check, log, deduct
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check balance
    const { data: creditData, error: creditError } = await supabaseAdmin
      .from('credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (creditError || !creditData) {
      return createErrorResponse(
        new Error('Failed to check credit balance'),
        correlationId,
        500,
        'BALANCE_CHECK_FAILED'
      );
    }

    if (creditData.balance < BLEND_COST) {
      return createErrorResponse(
        new Error(`Insufficient credits. Required: ${BLEND_COST}, Available: ${creditData.balance}`),
        correlationId,
        402,
        'INSUFFICIENT_CREDITS'
      );
    }

    // Log transaction first (idempotency record)
    const { error: txError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: -BLEND_COST,
        action: 'blend',
        provider: 'lovable',
        description: `Blend operation (Request ID: ${requestId}) - Correlation ID: ${correlationId}`,
      });

    if (txError) {
      console.error(`[${correlationId}] Failed to log transaction:`, txError);
      return createErrorResponse(
        new Error('Failed to record transaction'),
        correlationId,
        500,
        'TRANSACTION_LOG_FAILED'
      );
    }

    // Deduct credits
    const { error: deductError } = await supabaseAdmin
      .from('credits')
      .update({ balance: creditData.balance - BLEND_COST })
      .eq('user_id', userId);

    if (deductError) {
      console.error(`[${correlationId}] Credit deduction error:`, deductError);
      
      // Rollback transaction log
      await supabaseAdmin
        .from('credit_transactions')
        .delete()
        .eq('user_id', userId)
        .contains('description', correlationId);
      
      return createErrorResponse(
        new Error('Failed to deduct credits'),
        correlationId,
        500,
        'CREDIT_DEDUCTION_FAILED'
      );
    }

    console.log(`[${correlationId}] Credits deducted successfully`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

    // Build enhanced blending instruction
    const enhancedInstruction = instruction 
      ? `Create a professional, cohesive blend with these requirements: ${instruction}. Ensure consistent lighting direction, color grading harmony, realistic perspective alignment, and seamless visual integration.`
      : "Create a professional, designer-quality blend of these images. Ensure: 1) Consistent lighting and shadows across all elements, 2) Harmonious color grading, 3) Proper perspective and scale alignment, 4) Seamless transitions with no visible seams, 5) Unified artistic style and mood. The result should look like a single, professionally composed image.";

    // Build the content array
    const content = [
      { type: "text", text: enhancedInstruction },
      ...images.map((imageUrl: string) => ({
        type: "image_url",
        image_url: { url: imageUrl }
      }))
    ];

    // Call AI with retry logic
    const callBlendAPI = async () => {
      const response = await fetchWithTimeout(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
            "X-Correlation-ID": correlationId,
            "X-Request-ID": requestId,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image-preview",
            messages: [{ role: "user", content }],
            modalities: ["image", "text"]
          })
        },
        60000, // 60 second timeout
        correlationId
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${correlationId}] Blend API error:`, response.status, errorText);
        
        // Parse error details
        try {
          const errorData = JSON.parse(errorText);
          const providerError = errorData?.error?.metadata?.raw;
          if (providerError) {
            const parsedProviderError = JSON.parse(providerError);
            const specificMessage = parsedProviderError?.error?.message;
            
            if (specificMessage?.toLowerCase().includes('not available in your country')) {
              return createErrorResponse(
                new Error("Image blending is currently unavailable in your region. This feature uses AI image generation which has geographic restrictions."),
                correlationId,
                400,
                'REGION_RESTRICTED'
              );
            }
          }
        } catch {
          // Continue with generic error
        }
        
        throw new Error(`AI Gateway error: ${response.statusText}`);
      }

      return response;
    };

    // Retry logic for network/timeout errors
    const response = await retryWithBackoff(
      callBlendAPI,
      3,
      isRetryableError,
      correlationId
    );

    const data = await response.json();
    const blendedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!blendedImageUrl) {
      console.error(`[${correlationId}] No image in blend response`);
      
      // Refund credits on API failure
      await supabaseAdmin
        .from('credits')
        .update({ balance: creditData.balance })
        .eq('user_id', userId);
      
      // Remove transaction log
      await supabaseAdmin
        .from('credit_transactions')
        .delete()
        .eq('user_id', userId)
        .contains('description', correlationId);
      
      return createErrorResponse(
        new Error('No blended image returned from API. Credits have been refunded.'),
        correlationId,
        500,
        'NO_IMAGE_RETURNED'
      );
    }

    console.log(`[${correlationId}] Blend successful`);

    return createSuccessResponse(
      { image: blendedImageUrl },
      correlationId
    );

  } catch (error) {
    return createErrorResponse(error, correlationId);
  }
});
