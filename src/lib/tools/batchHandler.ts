import { supabase } from "@/integrations/supabase/client";
import { reserveCredits, commitCredits, refundCredits } from "@/lib/credits";
import { parseErrorCode, ErrorCode } from "@/lib/utils/errorCodes";

export interface BatchHandlerParams {
  images: File[];
  onProgress?: (current: number, total: number) => void;
  requestId?: string;
}

export interface BatchImageResult {
  success: boolean;
  fileName: string;
  data?: any;
  error?: string;
  errorCode?: ErrorCode;
}

export interface BatchHandlerResult {
  success: boolean;
  results: BatchImageResult[];
  requestId: string;
  error?: string;
}

const CREDIT_COST_PER_IMAGE = 1;
const TIMEOUT_PER_IMAGE_MS = 30000; // 30 seconds per image

/**
 * Centralized handler for batch image analysis operations
 * Prevents duplicate executions via requestId tracking
 */
export async function handleBatch({
  images,
  onProgress,
  requestId = crypto.randomUUID(),
}: BatchHandlerParams): Promise<BatchHandlerResult> {
  const startTime = Date.now();
  console.log(`[Batch:${requestId}] Starting batch operation`, {
    imageCount: images.length,
    timestamp: new Date().toISOString(),
  });

  try {
    // Validate inputs
    if (!images || images.length === 0) {
      throw new Error("At least one image is required for batch processing");
    }

    if (images.length > 10) {
      throw new Error("Maximum 10 images allowed for batch processing");
    }

    // Reserve credits for all images upfront
    const totalCredits = images.length * CREDIT_COST_PER_IMAGE;
    console.log(`[Batch:${requestId}] Reserving ${totalCredits} credits for ${images.length} images`);
    await reserveCredits(totalCredits, "batch_analyze", "lovable", requestId);

    const results: BatchImageResult[] = [];

    // Process images sequentially to avoid overloading
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      onProgress?.(i, images.length);

      console.log(`[Batch:${requestId}] Processing image ${i + 1}/${images.length}: ${file.name}`);

      try {
        // Convert image to base64
        const imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Call analyze-image edge function with retry logic (max 2 attempts per image)
        let attempt = 0;
        const maxAttempts = 2;
        let lastError: Error | null = null;
        let analysisSuccess = false;

        while (attempt < maxAttempts && !analysisSuccess) {
          attempt++;
          
          if (attempt > 1) {
            console.log(`[Batch:${requestId}] Image ${i + 1} retry attempt ${attempt}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay before retry
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_PER_IMAGE_MS);

          try {
            const { data, error } = await supabase.functions.invoke("analyze-image", {
              body: {
                image: imageUrl,
                request_id: `${requestId}-${i}`,
              },
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (error) {
              const errorCode = parseErrorCode(error);
              console.error(`[Batch:${requestId}] Image ${i + 1} attempt ${attempt} error:`, error);
              lastError = new Error(error.message || "Analysis failed");
              
              // Don't retry on validation errors
              if (error.message?.includes("Invalid") || error.message?.includes("required")) {
                results.push({
                  success: false,
                  fileName: file.name,
                  error: error?.message || 'Analysis failed',
                  errorCode,
                });
                break;
              }
              continue; // Retry on other errors
            }

            if (!data) {
              console.error(`[Batch:${requestId}] Image ${i + 1} attempt ${attempt}: No data returned`);
              lastError = new Error("No analysis data returned");
              continue; // Retry
            }

            // Success!
            results.push({
              success: true,
              fileName: file.name,
              data: data,
            });
            analysisSuccess = true;
          } catch (err) {
            clearTimeout(timeoutId);
            
            if (err instanceof Error && err.name === "AbortError") {
              lastError = new Error("Analysis timed out");
              console.error(`[Batch:${requestId}] Image ${i + 1} attempt ${attempt} timed out`);
              continue; // Retry on timeout
            }
            throw err; // Don't retry on unexpected errors
          }
        }

        // If all attempts failed, add error result
        if (!analysisSuccess) {
          const errorCode = parseErrorCode(lastError);
          results.push({
            success: false,
            fileName: file.name,
            error: lastError?.message || "Analysis failed after retries",
            errorCode,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorCode = parseErrorCode(error);
        console.error(`[Batch:${requestId}] Image ${i + 1} processing error:`, errorMessage);
        results.push({
          success: false,
          fileName: file.name,
          error: errorMessage,
          errorCode,
        });
      }
    }

    onProgress?.(images.length, images.length);

    const duration = Date.now() - startTime;
    const successCount = results.filter((r) => r.success).length;
    const failedCount = images.length - successCount;
    
    console.log(`[Batch:${requestId}] Completed in ${duration}ms`, {
      total: images.length,
      successful: successCount,
      failed: failedCount,
    });

    // Commit credits for successful images, refund failed ones
    if (failedCount > 0) {
      const refundAmount = failedCount * CREDIT_COST_PER_IMAGE;
      console.log(`[Batch:${requestId}] Refunding ${refundAmount} credits for ${failedCount} failed images`);
      try {
        await refundCredits(requestId, `${failedCount} of ${images.length} images failed to process`);
        // Re-reserve only successful images
        await reserveCredits(successCount * CREDIT_COST_PER_IMAGE, "batch_analyze", "lovable", `${requestId}-partial`);
        await commitCredits(`${requestId}-partial`);
      } catch (error) {
        console.error(`[Batch:${requestId}] Failed to handle partial refund:`, error);
      }
    } else {
      // All successful, commit full amount
      await commitCredits(requestId);
    }

    return {
      success: true,
      results,
      requestId,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error(`[Batch:${requestId}] Failed after ${duration}ms:`, {
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });

    // Refund all credits if batch failed completely
    if (!errorMessage.includes("Insufficient credits")) {
      console.log(`[Batch:${requestId}] Refunding all credits due to batch failure`);
      try {
        await refundCredits(requestId, `Batch operation failed: ${errorMessage}`);
      } catch (refundError) {
        console.error(`[Batch:${requestId}] Failed to refund credits:`, refundError);
      }
    }

    return {
      success: false,
      results: [],
      error: errorMessage,
      requestId,
    };
  }
}
