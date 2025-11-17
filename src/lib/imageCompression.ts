/**
 * Wrapper for browser-image-compression to handle Vite/ESBuild compatibility issues
 * This module provides a safe way to import and use browser-image-compression
 * without triggering getOriginalSymbol errors
 */

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  maxIteration?: number;
  exifOrientation?: number;
  fileType?: string;
  initialQuality?: number;
  alwaysKeepResolution?: boolean;
}

/**
 * Compress an image file using browser-image-compression
 * This function dynamically imports the library to avoid build-time issues
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  try {
    // Use dynamic import to avoid Vite optimization issues
    // Import as namespace to handle both ESM and CommonJS
    const compressionModule = await import('browser-image-compression');
    
    // Handle both default export and named export
    const imageCompression = 
      compressionModule.default || 
      compressionModule || 
      (compressionModule as any).imageCompression;
    
    if (typeof imageCompression !== 'function') {
      throw new Error('browser-image-compression is not a function');
    }
    
    const defaultOptions: CompressionOptions = {
      maxSizeMB: 1,
      maxWidthOrHeight: 2048,
      useWebWorker: true,
      ...options,
    };
    
    return await imageCompression(file, defaultOptions);
  } catch (error) {
    console.error('Image compression error:', error);
    // If compression fails, return original file
    throw error;
  }
}

/**
 * Check if image compression is available
 */
export async function isCompressionAvailable(): Promise<boolean> {
  try {
    await import('browser-image-compression');
    return true;
  } catch {
    return false;
  }
}

