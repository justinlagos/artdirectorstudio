import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ToolConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
}

const DEFAULT_CONFIG: ToolConfig = {
  maxRetries: 2,
  retryDelay: 2000,
  timeout: 90000, // 90 seconds for heavy operations
};

function getBackoffDelay(attempt: number, baseDelay: number): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 15000);
}

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
 * Convert File to base64
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Blend multiple images
 */
export async function blendImages(
  imageFiles: File[],
  instruction: string,
  onProgress?: (progress: number) => void,
  config: Partial<ToolConfig> = {}
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const { maxRetries, retryDelay, timeout } = { ...DEFAULT_CONFIG, ...config };
  
  if (imageFiles.length < 2 || imageFiles.length > 4) {
    return { success: false, error: "Please provide 2-4 images to blend" };
  }

  let lastError: any = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: "Authentication required" };
      }

      // Deduct credits
      const { data: deductData, error: deductError } = await supabase.functions.invoke("deduct-credits", {
        body: { action: "blend", provider: "lovable" },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (deductError || !deductData?.success) {
        const errorMsg = deductError?.message?.includes("Insufficient credits")
          ? "Insufficient credits. You need 2 credits to blend images."
          : "Failed to process credit deduction.";
        return { success: false, error: errorMsg };
      }

      onProgress?.(30);

      // Convert files to base64
      const base64Images = await Promise.all(
        imageFiles.map(file => fileToBase64(file))
      );

      onProgress?.(50);

      // Create timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Blend operation timeout')), timeout);
      });

      const blendPromise = supabase.functions.invoke("blend-images", {
        body: { images: base64Images, instruction },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const { data, error } = await Promise.race([
        blendPromise,
        timeoutPromise
      ]) as any;

      if (error) {
        lastError = error;
        
        // Check for region restriction error
        if (error?.message?.includes('IMAGE_BLEND_UNAVAILABLE')) {
          return { 
            success: false, 
            error: "Image blending is currently unavailable in your region. This feature uses AI image generation which has geographic restrictions." 
          };
        }
        
        if (isRetryableError(error) && attempt < maxRetries) {
          const delay = getBackoffDelay(attempt, retryDelay);
          toast.info(`Retrying blend operation... (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }

      onProgress?.(100);

      if (!data?.image) {
        return { success: false, error: "No blended image returned" };
      }

      return {
        success: true,
        imageUrl: data.image,
      };
    } catch (error) {
      lastError = error;
      console.error(`Blend attempt ${attempt + 1} failed:`, error);
      
      // Check for region restriction error
      if (error instanceof Error && error.message?.includes('IMAGE_BLEND_UNAVAILABLE')) {
        return { 
          success: false, 
          error: "Image blending is currently unavailable in your region. This feature uses AI image generation which has geographic restrictions." 
        };
      }
      
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
    : "Blend failed after multiple attempts";
  
  return { success: false, error: errorMsg };
}

/**
 * Upscale image
 */
export async function upscaleImage(
  imageFile: File,
  targetSize: '1536x1536' | '2048x2048',
  onProgress?: (progress: number) => void,
  config: Partial<ToolConfig> = {}
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
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
        body: { action: "upscale", provider: "lovable" },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (deductError || !deductData?.success) {
        const errorMsg = deductError?.message?.includes("Insufficient credits")
          ? "Insufficient credits. You need 2 credits to upscale an image."
          : "Failed to process credit deduction.";
        return { success: false, error: errorMsg };
      }

      onProgress?.(30);

      // Convert to base64
      const base64Image = await fileToBase64(imageFile);

      onProgress?.(50);

      // Create timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Upscale operation timeout')), timeout);
      });

      const upscalePromise = supabase.functions.invoke("upscale-image", {
        body: { image: base64Image, targetSize },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const { data, error } = await Promise.race([
        upscalePromise,
        timeoutPromise
      ]) as any;

      if (error) {
        lastError = error;
        
        if (isRetryableError(error) && attempt < maxRetries) {
          const delay = getBackoffDelay(attempt, retryDelay);
          toast.info(`Retrying upscale operation... (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }

      onProgress?.(100);

      if (!data?.image) {
        return { success: false, error: "No upscaled image returned" };
      }

      return {
        success: true,
        imageUrl: data.image,
      };
    } catch (error) {
      lastError = error;
      console.error(`Upscale attempt ${attempt + 1} failed:`, error);
      
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
    : "Upscale failed after multiple attempts";
  
  return { success: false, error: errorMsg };
}

/**
 * Batch analyze images
 */
export async function batchAnalyzeImages(
  imageFiles: File[],
  onProgress?: (current: number, total: number) => void,
  config: Partial<ToolConfig> = {}
): Promise<{
  success: boolean;
  results: Array<{ success: boolean; data?: any; error?: string; fileName: string }>;
}> {
  const { timeout } = { ...DEFAULT_CONFIG, ...config };
  const results: Array<{ success: boolean; data?: any; error?: string; fileName: string }> = [];
  
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    onProgress?.(i, imageFiles.length);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        results.push({
          success: false,
          error: "Authentication required",
          fileName: file.name
        });
        continue;
      }

      // Deduct credits
      const { data: deductData, error: deductError } = await supabase.functions.invoke("deduct-credits", {
        body: { action: "analyze", provider: "lovable" },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (deductError || !deductData?.success) {
        results.push({
          success: false,
          error: "Insufficient credits",
          fileName: file.name
        });
        continue;
      }

      // Convert to base64
      const base64Image = await fileToBase64(file);

      // Analyze with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timeout')), timeout);
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
        results.push({
          success: false,
          error: error.message || "Analysis failed",
          fileName: file.name
        });
      } else {
        results.push({
          success: true,
          data: data,
          fileName: file.name
        });
      }
    } catch (error) {
      console.error(`Error analyzing ${file.name}:`, error);
      results.push({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        fileName: file.name
      });
    }
    
    // Small delay between requests
    if (i < imageFiles.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  onProgress?.(imageFiles.length, imageFiles.length);
  
  return {
    success: true,
    results
  };
}
