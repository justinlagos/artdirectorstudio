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
