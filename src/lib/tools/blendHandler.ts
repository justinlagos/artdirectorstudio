import { supabase } from "@/integrations/supabase/client";
import { reserveCredits, commitCredits, refundCredits } from "@/lib/credits";

export interface BlendHandlerParams {
  images: File[];
  instruction: string;
  onProgress?: (progress: number) => void;
  requestId?: string;
}

export interface BlendHandlerResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  requestId: string;
}

const CREDIT_COST = 2;
const TIMEOUT_MS = 60000; // 60 seconds

/**
 * Centralized handler for image blending operations
 * Prevents duplicate executions via requestId tracking
 */
export async function handleBlend({
  images,
  instruction,
  onProgress,
  requestId = crypto.randomUUID(),
}: BlendHandlerParams): Promise<BlendHandlerResult> {
  const startTime = Date.now();
  console.log(`[Blend:${requestId}] Starting blend operation`, {
    imageCount: images.length,
    timestamp: new Date().toISOString(),
  });

  try {
    // Validate inputs
    if (!images || images.length < 2 || images.length > 4) {
      throw new Error("Blend requires 2-4 images");
    }

    // Reserve credits before operation
    console.log(`[Blend:${requestId}] Reserving ${CREDIT_COST} credits`);
    await reserveCredits(CREDIT_COST, "blend", "lovable", requestId);

    onProgress?.(10);

    // Convert images to base64
    const imageUrls = await Promise.all(
      images.map(async (file) => {
        const reader = new FileReader();
        return new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })
    );

    onProgress?.(30);

    console.log(`[Blend:${requestId}] Images converted, calling edge function`);

    // Call edge function with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const { data, error } = await supabase.functions.invoke("blend-images", {
        body: {
          images: imageUrls,
          instruction,
          request_id: requestId,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (error) {
        console.error(`[Blend:${requestId}] Edge function error:`, error);
        throw new Error(error.message || "Blend operation failed");
      }

      if (!data?.image) {
        throw new Error("No image returned from blend operation");
      }

      onProgress?.(100);

      // Commit credits after successful operation
      console.log(`[Blend:${requestId}] Committing credits`);
      await commitCredits(requestId);

      const duration = Date.now() - startTime;
      console.log(`[Blend:${requestId}] Success in ${duration}ms`);

      return {
        success: true,
        imageUrl: data.image,
        requestId,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Blend operation timed out. Please try again.");
      }
      throw err;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error(`[Blend:${requestId}] Failed after ${duration}ms:`, {
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });

    // Refund credits if operation failed
    if (!errorMessage.includes("Insufficient credits")) {
      console.log(`[Blend:${requestId}] Refunding credits due to failure`);
      try {
        await refundCredits(requestId, `Blend operation failed: ${errorMessage}`);
      } catch (refundError) {
        console.error(`[Blend:${requestId}] Failed to refund credits:`, refundError);
      }
    }

    return {
      success: false,
      error: errorMessage,
      requestId,
    };
  }
}
