import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GenerationOptions {
  quality?: 'auto' | 'low' | 'medium' | 'high';
  size?: string;
  background?: 'transparent' | 'opaque' | 'auto';
}

interface GenerationConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
}

const DEFAULT_CONFIG: GenerationConfig = {
  maxRetries: 3,
  retryDelay: 2000,
  timeout: 60000, // 60 seconds
};

/**
 * Exponential backoff delay calculation
 */
function getBackoffDelay(attempt: number, baseDelay: number): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 10000);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  const errorMsg = error?.message?.toLowerCase() || '';
  return (
    errorMsg.includes('network') ||
    errorMsg.includes('timeout') ||
    errorMsg.includes('connection') ||
    errorMsg.includes('502') ||
    errorMsg.includes('503') ||
    errorMsg.includes('504')
  );
}

/**
 * Generate image with retry logic and proper error handling
 */
export async function generateImage(
  prompt: string,
  options: GenerationOptions = {},
  config: Partial<GenerationConfig> = {}
): Promise<{ success: boolean; imageUrl?: string; assetId?: string; error?: string }> {
  const { maxRetries, retryDelay, timeout } = { ...DEFAULT_CONFIG, ...config };
  
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: "Authentication required" };
      }

      // Deduct credits first
      const { data: deductData, error: deductError } = await supabase.functions.invoke("deduct-credits", {
        body: { action: "generate", provider: "lovable" },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (deductError || !deductData?.success) {
        const errorMsg = deductError?.message?.includes("Insufficient credits")
          ? "Insufficient credits. You need 3 credits to generate an image."
          : "Failed to process payment. Please try again.";
        return { success: false, error: errorMsg };
      }

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      });

      // Call generate-image edge function with timeout
      const generatePromise = supabase.functions.invoke("generate-image", {
        body: { 
          prompt,
          quality: options.quality,
          size: options.size,
          background: options.background
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const { data, error } = await Promise.race([
        generatePromise,
        timeoutPromise
      ]) as any;

      if (error) {
        lastError = error;
        
        // Handle specific errors
        if (error.message?.includes("Rate limit")) {
          return { success: false, error: "Rate limit exceeded. Please wait a moment and try again." };
        }
        
        if (error.message?.includes("credits exhausted")) {
          return { success: false, error: "AI service temporarily unavailable. Please try again later." };
        }

        // Retry for retryable errors
        if (isRetryableError(error) && attempt < maxRetries) {
          const delay = getBackoffDelay(attempt, retryDelay);
          toast.info(`Connection issue. Retrying in ${delay / 1000}s... (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }

      if (!data?.image) {
        return { success: false, error: "No image returned from service" };
      }

      return {
        success: true,
        imageUrl: data.image,
        assetId: data.assetId,
      };
    } catch (error) {
      lastError = error;
      console.error(`Generation attempt ${attempt + 1} failed:`, error);
      
      // Retry for retryable errors
      if (isRetryableError(error) && attempt < maxRetries) {
        const delay = getBackoffDelay(attempt, retryDelay);
        toast.info(`Connection issue. Retrying in ${delay / 1000}s... (${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Final attempt failed
      if (attempt === maxRetries) {
        break;
      }
    }
  }
  
  // All retries exhausted
  const errorMsg = lastError instanceof Error 
    ? lastError.message 
    : "Generation failed after multiple attempts";
  
  return { success: false, error: errorMsg };
}

/**
 * Analyze image with retry logic
 */
export async function analyzeImage(
  base64Image: string,
  config: Partial<GenerationConfig> = {}
): Promise<{ success: boolean; data?: any; error?: string }> {
  const { maxRetries, retryDelay, timeout } = { ...DEFAULT_CONFIG, ...config };
  
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: "Authentication required" };
      }

      // Deduct credits
      const { data: deductData, error: deductError } = await supabase.functions.invoke("deduct-credits", {
        body: { action: "analyze", provider: "lovable" },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (deductError || !deductData?.success) {
        const errorMsg = deductError?.message?.includes("Insufficient credits")
          ? "Insufficient credits. Please purchase more credits."
          : "Failed to process payment.";
        return { success: false, error: errorMsg };
      }

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      });

      const analyzePromise = supabase.functions.invoke("analyze-image", {
        body: { image: base64Image },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const { data, error } = await Promise.race([
        analyzePromise,
        timeoutPromise
      ]) as any;

      if (error) {
        lastError = error;
        
        if (isRetryableError(error) && attempt < maxRetries) {
          const delay = getBackoffDelay(attempt, retryDelay);
          toast.info(`Connection issue. Retrying analysis... (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }

      return { success: true, data };
    } catch (error) {
      lastError = error;
      console.error(`Analysis attempt ${attempt + 1} failed:`, error);
      
      if (isRetryableError(error) && attempt < maxRetries) {
        const delay = getBackoffDelay(attempt, retryDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (attempt === maxRetries) {
        break;
      }
    }
  }
  
  const errorMsg = lastError instanceof Error 
    ? lastError.message 
    : "Analysis failed after multiple attempts";
  
  return { success: false, error: errorMsg };
}
