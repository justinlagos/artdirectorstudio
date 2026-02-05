/**
 * CDN Helper Functions
 * 
 * Provides CDN URL generation and optimization helpers
 * In production, would integrate with Cloudflare Images or similar
 */

export interface CDNOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
  fit?: 'cover' | 'contain' | 'fill';
}

/**
 * Get optimized CDN URL for an image
 */
export function getCDNUrl(url: string, options: CDNOptions = {}): string {
  // In production, this would generate Cloudflare Images URLs
  // For now, return original URL
  // Example: return `https://imagedelivery.net/${accountHash}/${imageId}/${variant}`
  
  if (!url) return url;
  
  // If already a CDN URL, return as-is
  if (url.includes('imagedelivery.net') || url.includes('cdn')) {
    return url;
  }
  
  // For now, return original URL
  // TODO: Integrate with actual CDN service
  return url;
}

/**
 * Generate responsive image srcset
 */
export function generateSrcSet(baseUrl: string, widths: number[] = [320, 640, 1024, 1920]): string {
  return widths
    .map(width => `${getCDNUrl(baseUrl, { width })} ${width}w`)
    .join(', ');
}

/**
 * Get optimized image URL for specific size
 */
export function getOptimizedImageUrl(
  url: string,
  width: number,
  quality: number = 80
): string {
  return getCDNUrl(url, { width, quality, format: 'webp' });
}
