import { supabase } from "@/integrations/supabase/client";

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

    // Call edge function with timeout
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
        console.error(`[Upscale:${requestId}] Edge function error:`, error);
        throw new Error(error.message || "Upscale operation failed");
      }

      if (!data?.image) {
        throw new Error("No image returned from upscale operation");
      }

      onProgress?.(100);

      const duration = Date.now() - startTime;
      console.log(`[Upscale:${requestId}] Success in ${duration}ms`);

      return {
        success: true,
        imageUrl: data.image,
        requestId,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Upscale operation timed out. Please try again.");
      }
      throw err;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error(`[Upscale:${requestId}] Failed after ${duration}ms:`, {
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      error: errorMessage,
      requestId,
    };
  }
}
