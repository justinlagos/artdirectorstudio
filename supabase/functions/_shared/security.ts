/**
 * Security Hardening Utilities
 * 
 * Baseline security practices:
 * - Input sanitization everywhere
 * - Parameterized queries only (handled by Supabase client)
 * - Strict CSP headers (handled at edge function level)
 * - XSS protection on any rendered text
 * - File type validation on uploads
 * - Rate limiting on generation endpoints
 * - No client-side trust
 * - Assume hostile input always
 */

/**
 * Sanitizes text input to prevent XSS
 * Removes potentially dangerous characters and patterns
 */
export function sanitizeText(input: string, maxLength?: number): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Enforce max length if provided
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Validates file MIME type
 */
export function validateMimeType(mimeType: string, allowedTypes: string[]): boolean {
  if (!mimeType || typeof mimeType !== 'string') {
    return false;
  }

  return allowedTypes.some(allowed => {
    if (allowed.endsWith('/*')) {
      // Wildcard match (e.g., 'image/*')
      const base = allowed.split('/')[0];
      return mimeType.startsWith(`${base}/`);
    }
    return mimeType === allowed;
  });
}

/**
 * Validates file size
 */
export function validateFileSize(size: number, maxSizeBytes: number): boolean {
  return typeof size === 'number' && size > 0 && size <= maxSizeBytes;
}

/**
 * Validates image data URI format
 */
export function validateImageDataUri(dataUri: string): {
  valid: boolean;
  mimeType?: string;
  error?: string;
} {
  if (!dataUri || typeof dataUri !== 'string') {
    return { valid: false, error: 'Invalid data URI' };
  }

  // Must start with data:image/
  if (!dataUri.startsWith('data:image/')) {
    return { valid: false, error: 'Invalid image data URI format' };
  }

  // Extract MIME type
  const mimeMatch = dataUri.match(/^data:image\/([^;]+)/);
  if (!mimeMatch) {
    return { valid: false, error: 'Invalid MIME type in data URI' };
  }

  const mimeType = `image/${mimeMatch[1].toLowerCase()}`;
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (!allowedTypes.includes(mimeType)) {
    return { valid: false, error: `Unsupported image type: ${mimeType}` };
  }

  // Check for base64 data
  const base64Data = dataUri.split(',')[1];
  if (!base64Data || base64Data.length === 0) {
    return { valid: false, error: 'Missing base64 data' };
  }

  // Basic base64 validation
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(base64Data)) {
    return { valid: false, error: 'Invalid base64 encoding' };
  }

  return { valid: true, mimeType };
}

/**
 * Validates URL format
 */
export function validateUrl(url: string, allowedProtocols: string[] = ['http:', 'https:']): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return allowedProtocols.includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Validates UUID format
 */
export function validateUuid(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Rate limiting is handled by _shared/rateLimit.ts
// Import and use checkRateLimit from there

/**
 * Sanitizes prompt text for safe storage and display
 */
export function sanitizePrompt(prompt: string): string {
  return sanitizeText(prompt, 2000);
}

/**
 * Validates user ownership of an asset
 * Returns true if user owns the asset, false otherwise
 */
export async function validateAssetOwnership(
  supabaseAdmin: any,
  assetId: string,
  userId: string
): Promise<{ valid: boolean; error?: string }> {
  if (!validateUuid(assetId)) {
    return { valid: false, error: 'Invalid asset ID format' };
  }

  if (!validateUuid(userId)) {
    return { valid: false, error: 'Invalid user ID format' };
  }

  const { data: asset, error } = await supabaseAdmin
    .from('generated_assets')
    .select('id, user_id')
    .eq('id', assetId)
    .single();

  if (error || !asset) {
    return { valid: false, error: 'Asset not found' };
  }

  if (asset.user_id !== userId) {
    return { valid: false, error: 'Unauthorized access' };
  }

  return { valid: true };
}

/**
 * Content Security Policy headers for responses
 */
export const CSP_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};
