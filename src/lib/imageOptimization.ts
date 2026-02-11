/**
 * Image optimization utilities for WebP conversion and responsive images
 */

export interface ImageSize {
  width: number;
  suffix: string;
}

export const DEFAULT_SIZES: ImageSize[] = [
  { width: 320, suffix: 'sm' },
  { width: 640, suffix: 'md' },
  { width: 1024, suffix: 'lg' },
  { width: 1920, suffix: 'xl' },
];

/**
 * Convert an image to WebP format
 */
export async function convertToWebP(
  imageUrl: string,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error('Failed to convert image to WebP'));
          }
        },
        'image/webp',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * Generate responsive image at specific width
 */
export async function generateResponsiveImage(
  imageUrl: string,
  targetWidth: number,
  format: 'webp' | 'jpeg' = 'webp',
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      const targetHeight = Math.round(targetWidth * aspectRatio);
      
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      
      const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error('Failed to generate responsive image'));
          }
        },
        mimeType,
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webp = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
    const img = new Image();
    img.onload = () => resolve(img.width === 1);
    img.onerror = () => resolve(false);
    img.src = webp;
  });
}

/**
 * Get optimal image dimensions based on container size
 */
export function getOptimalDimensions(
  containerWidth: number,
  sizes: ImageSize[] = DEFAULT_SIZES
): ImageSize {
  const dpr = window.devicePixelRatio || 1;
  const targetWidth = containerWidth * dpr;
  
  return sizes.reduce((prev, curr) => {
    return Math.abs(curr.width - targetWidth) < Math.abs(prev.width - targetWidth)
      ? curr
      : prev;
  });
}

/**
 * Generate a low-quality image placeholder (LQIP) for blur-up effect
 */
export async function generateLQIP(
  imageUrl: string,
  width: number = 20,
  quality: number = 0.1
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      const height = Math.round(width * aspectRatio);
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error('Failed to generate LQIP'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image for LQIP'));
    img.src = imageUrl;
  });
}

/**
 * Convert image to base64 LQIP data URL (for inline embedding)
 */
export async function generateBase64LQIP(
  imageUrl: string,
  width: number = 20,
  quality: number = 0.1
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      const height = Math.round(width * aspectRatio);
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };
    
    img.onerror = () => reject(new Error('Failed to load image for LQIP'));
    img.src = imageUrl;
  });
}

/** Max dimension for analysis-optimized images. Vision APIs work well at this size and payload stays small. */
const ANALYSIS_MAX_DIMENSION = 1536;

/** Quality for JPEG compression when resizing for analysis. Balances file size and detail. */
const ANALYSIS_JPEG_QUALITY = 0.88;

/**
 * Resize an image for analysis to reduce upload time and AI processing latency.
 * If the image is already small enough, returns the original.
 * Output is JPEG base64 data URL suitable for analyze-image.
 */
export async function resizeImageForAnalysis(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w <= ANALYSIS_MAX_DIMENSION && h <= ANALYSIS_MAX_DIMENSION) {
        resolve(dataUrl);
        return;
      }
      const scale = Math.min(ANALYSIS_MAX_DIMENSION / w, ANALYSIS_MAX_DIMENSION / h);
      const width = Math.round(w * scale);
      const height = Math.round(h * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', ANALYSIS_JPEG_QUALITY));
    };
    img.onerror = () => reject(new Error('Failed to load image for resizing'));
    img.src = dataUrl;
  });
}

/**
 * Get optimized image URL using Cloudflare Images
 * Wraps image URLs with Cloudflare optimization parameters
 * 
 * For Supabase storage URLs, this will use Cloudflare Images to optimize and serve
 * the images with proper format, quality, and sizing.
 */
export function getOptimizedImageUrl(
  imageUrl: string | null | undefined,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpg' | 'png';
    fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  }
): string {
  if (!imageUrl) return '';
  
  const CLOUDFLARE_ACCOUNT_ID = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID;
  
  // If Cloudflare is not configured, return original URL
  if (!CLOUDFLARE_ACCOUNT_ID) {
    return imageUrl;
  }
  
  // If already a Cloudflare URL, return as-is
  if (imageUrl.includes('imagedelivery.net')) {
    return imageUrl;
  }
  
  // If it's a data URL or blob URL, return as-is
  if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    return imageUrl;
  }
  
  // For Supabase storage URLs, use Cloudflare Images to optimize
  // Cloudflare Images can proxy and optimize external images
  if (imageUrl.includes('supabase.co') || imageUrl.includes('supabase')) {
    // Extract the path from Supabase URL for use as image identifier
    // Cloudflare Images requires images to be uploaded, but we can use
    // Cloudflare's image resizing service as a proxy
    const baseUrl = `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_ID}`;
    
    // Use the full URL as the image identifier (URL-encoded)
    const imageId = encodeURIComponent(imageUrl);
    
    const params = new URLSearchParams();
    
    if (options?.width) {
      params.append('w', options.width.toString());
    }
    if (options?.height) {
      params.append('h', options.height.toString());
    }
    if (options?.quality) {
      params.append('q', Math.min(100, Math.max(1, options.quality)).toString());
    } else {
      params.append('q', '85'); // Default quality
    }
    if (options?.format) {
      params.append('f', options.format);
    } else {
      params.append('f', 'webp'); // Default to WebP for better compression
    }
    if (options?.fit) {
      params.append('fit', options.fit);
    } else {
      params.append('fit', 'scale-down'); // Default fit to maintain aspect ratio
    }
    
    const queryString = params.toString();
    return `${baseUrl}/${imageId}?${queryString}`;
  }
  
  // For other external images, return original URL
  // Note: Cloudflare Images typically requires images to be uploaded first
  // For production, consider uploading images to Cloudflare Images during generation
  return imageUrl;
}
