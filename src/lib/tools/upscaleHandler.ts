import { supabase } from "@/integrations/supabase/client";
import { reserveCredits, commitCredits, refundCredits } from "@/lib/credits";

export interface UpscaleHandlerParams {
  image: File;
  targetSize: "1536x1536" | "2048x2048";
  onProgress?: (progress: number) => void;
  requestId?: string;
}

export interface UpscaleHandlerResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  requestId: string;
}

const CREDIT_COST = 2;
const TIMEOUT_MS = 60000; // 60 seconds

/**
 * Centralized handler for image upscaling operations
 * Prevents duplicate executions via requestId tracking
 */
export async function handleUpscale({
  image,
  targetSize,
  onProgress,
  requestId = crypto.randomUUID(),
}: UpscaleHandlerParams): Promise<UpscaleHandlerResult> {
  const startTime = Date.now();
  console.log(`[Upscale:${requestId}] Starting upscale operation`, {
    targetSize,
    timestamp: new Date().toISOString(),
  });

  try {
    // Validate input
    if (!image) {
      throw new Error("Image is required for upscaling");
    }

    // Reserve credits before operation
    console.log(`[Upscale:${requestId}] Reserving ${CREDIT_COST} credits`);
    await reserveCredits(CREDIT_COST, "upscale", "lovable", requestId);

    onProgress?.(10);

    // Convert image to base64
    const imageUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(image);
    });

    onProgress?.(30);

    console.log(`[Upscale:${requestId}] Image converted, calling edge function`);

    // Call edge function with retry logic
    let attempt = 0;
    const maxAttempts = 2;
    let lastError: Error | null = null;

    while (attempt < maxAttempts) {
      attempt++;
      const isRetry = attempt > 1;
      
      if (isRetry) {
        console.log(`[Upscale:${requestId}] Retry attempt ${attempt}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay before retry
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const { data, error } = await supabase.functions.invoke("upscale-image", {
          body: {
            image: imageUrl,
            targetSize,
            request_id: requestId,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (error) {
          console.error(`[Upscale:${requestId}] Attempt ${attempt} error:`, error);
          lastError = new Error(error.message || "Upscale operation failed");
          
          // Don't retry on insufficient credits or validation errors
          if (error.message?.includes("Insufficient credits") || 
              error.message?.includes("Invalid") ||
              error.message?.includes("required")) {
            throw lastError;
          }
          
          // Retry on network/timeout errors
          continue;
        }

        if (!data?.image) {
          console.error(`[Upscale:${requestId}] Attempt ${attempt}: No image returned`);
          lastError = new Error("No image returned from upscale operation");
          continue; // Retry
        }

        // Success!
        onProgress?.(100);

        // Commit credits after successful operation
        console.log(`[Upscale:${requestId}] Committing credits`);
        await commitCredits(requestId);

        const duration = Date.now() - startTime;
        console.log(`[Upscale:${requestId}] Success in ${duration}ms after ${attempt} attempt(s)`);

        return {
          success: true,
          imageUrl: data.image,
          requestId,
        };
      } catch (err) {
        clearTimeout(timeoutId);
        
        if (err instanceof Error && err.name === "AbortError") {
          lastError = new Error("Upscale operation timed out");
          console.error(`[Upscale:${requestId}] Attempt ${attempt} timed out`);
          continue; // Retry on timeout
        }
        throw err; // Don't retry on unexpected errors
      }
    }

    // All attempts failed
    throw lastError || new Error("Upscale operation failed after retries");
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error(`[Upscale:${requestId}] Failed after ${duration}ms:`, {
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });

    // Refund credits if operation failed
    if (!errorMessage.includes("Insufficient credits")) {
      console.log(`[Upscale:${requestId}] Refunding credits due to failure`);
      try {
        await refundCredits(requestId, `Upscale operation failed: ${errorMessage}`);
      } catch (refundError) {
        console.error(`[Upscale:${requestId}] Failed to refund credits:`, refundError);
      }
    }

    return {
      success: false,
      error: errorMessage,
      requestId,
    };
  }
}
