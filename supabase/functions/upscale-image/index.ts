import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  handleCorsPreflightRequest,
  createErrorResponse,
  createSuccessResponse,
  generateCorrelationId,
  validateEnvVars,
  fetchWithTimeout,
  retryWithBackoff,
  isRetryableError,
  logRequest,
} from "../_shared/edgeFunctionUtils.ts";

serve(async (req) => {
  const correlationId = generateCorrelationId();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    logRequest(req.method, '/upscale-image', correlationId);
    
    // Validate required environment variables
    validateEnvVars(['LOVABLE_API_KEY'], correlationId);

    const { image, targetSize, request_id } = await req.json();
    const requestId = request_id || correlationId;
    
    console.log(`[${correlationId}] [RequestID:${requestId}] Upscaling image to size:`, targetSize);

    // Validate input
    if (!image) {
      return createErrorResponse(
        new Error('Image is required'),
        correlationId,
        400,
        'MISSING_IMAGE'
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

    // Build upscale prompt based on target size
    const upscalePrompt = targetSize === '2048x2048' 
      ? "Upscale this image to ultra high resolution (2048x2048), enhancing details and clarity while preserving the original style and subject."
      : "Upscale this image to high resolution (1536x1536), enhancing details and clarity while maintaining the original composition.";

    // Call AI with retry logic
    const callUpscaleAPI = async () => {
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
            messages: [{
              role: "user",
              content: [
                { type: "text", text: upscalePrompt },
                { type: "image_url", image_url: { url: image } }
              ]
            }],
            modalities: ["image", "text"]
          })
        },
        60000, // 60 second timeout
        correlationId
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${correlationId}] Upscale API error:`, response.status, errorText);
        
        // Parse for region restrictions
        try {
          const errorData = JSON.parse(errorText);
          const providerError = errorData?.error?.metadata?.raw;
          if (providerError) {
            const parsedProviderError = JSON.parse(providerError);
            const specificMessage = parsedProviderError?.error?.message;
            
            if (specificMessage?.toLowerCase().includes('not available in your country')) {
              return createErrorResponse(
                new Error("Image upscaling is currently unavailable in your region. This feature uses AI image generation which has geographic restrictions."),
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
      callUpscaleAPI,
      3,
      isRetryableError,
      correlationId
    );

    const data = await response.json();
    const upscaledImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!upscaledImageUrl) {
      return createErrorResponse(
        new Error('No upscaled image returned from API'),
        correlationId,
        500,
        'NO_IMAGE_RETURNED'
      );
    }

    console.log(`[${correlationId}] Upscale successful`);

    return createSuccessResponse(
      { image: upscaledImageUrl },
      correlationId
    );

  } catch (error) {
    return createErrorResponse(error, correlationId);
  }
});
