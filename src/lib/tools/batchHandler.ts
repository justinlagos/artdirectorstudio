import { supabase } from "@/integrations/supabase/client";

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

        // Call analyze-image edge function with timeout
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
            console.error(`[Batch:${requestId}] Image ${i + 1} error:`, error);
            results.push({
              success: false,
              fileName: file.name,
              error: error.message || "Analysis failed",
            });
          } else {
            results.push({
              success: true,
              fileName: file.name,
              data: data,
            });
          }
        } catch (err) {
          clearTimeout(timeoutId);
          
          if (err instanceof Error && err.name === "AbortError") {
            results.push({
              success: false,
              fileName: file.name,
              error: "Analysis timed out",
            });
          } else {
            throw err;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Batch:${requestId}] Image ${i + 1} processing error:`, errorMessage);
        results.push({
          success: false,
          fileName: file.name,
          error: errorMessage,
        });
      }
    }

    onProgress?.(images.length, images.length);

    const duration = Date.now() - startTime;
    const successCount = results.filter((r) => r.success).length;
    console.log(`[Batch:${requestId}] Completed in ${duration}ms`, {
      total: images.length,
      successful: successCount,
      failed: images.length - successCount,
    });

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

    return {
      success: false,
      results: [],
      error: errorMessage,
      requestId,
    };
  }
}
