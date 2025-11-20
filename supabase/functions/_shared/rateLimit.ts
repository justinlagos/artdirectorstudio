/**
 * Rate limiting utility for edge functions
 * Prevents abuse and ensures fair usage
 */

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitCache = new Map<string, RateLimitBucket>();

// Clean up expired buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitCache.entries()) {
    if (bucket.resetAt < now) {
      rateLimitCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check if a request should be rate limited
 * 
 * @param userId - User ID to rate limit
 * @param action - Action being performed (e.g., "generate-image")
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result
 * 
 * @example
 * const rateLimit = await checkRateLimit(userId, 'generate-image', 10, 60000);
 * if (!rateLimit.allowed) {
 *   return new Response(
 *     JSON.stringify({ error: "Rate limit exceeded", retryAfter: rateLimit.retryAfter }),
 *     { status: 429, headers: corsHeaders }
 *   );
 * }
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): Promise<RateLimitResult> {
  const key = `${userId}:${action}`;
  const now = Date.now();
  
  let bucket = rateLimitCache.get(key);
  
  // Create new bucket or reset expired one
  if (!bucket || bucket.resetAt < now) {
    bucket = { 
      count: 0, 
      resetAt: now + windowMs 
    };
    rateLimitCache.set(key, bucket);
  }
  
  // Check if limit exceeded
  if (bucket.count >= maxRequests) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    
    console.log(`[RateLimit] ${action} blocked for user ${userId.substring(0, 8)}... (${bucket.count}/${maxRequests})`);
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfter,
    };
  }
  
  // Increment counter
  bucket.count++;
  
  console.log(`[RateLimit] ${action} allowed for user ${userId.substring(0, 8)}... (${bucket.count}/${maxRequests})`);
  
  return {
    allowed: true,
    remaining: maxRequests - bucket.count,
    resetAt: bucket.resetAt,
  };
}

/**
 * Create rate limit headers for HTTP response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.remaining + (result.allowed ? 1 : 0)),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
  };
  
  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }
  
  return headers;
}

/**
 * Get rate limit configuration based on user tier
 */
export function getRateLimitConfig(
  action: string,
  userTier: string = 'free'
): RateLimitConfig {
  const configs: Record<string, Record<string, RateLimitConfig>> = {
    'generate-image': {
      free: { maxRequests: 5, windowMs: 60000 },      // 5 per minute
      starter: { maxRequests: 10, windowMs: 60000 },  // 10 per minute
      pro: { maxRequests: 30, windowMs: 60000 },      // 30 per minute
    },
    'edit-image': {
      free: { maxRequests: 10, windowMs: 60000 },
      starter: { maxRequests: 20, windowMs: 60000 },
      pro: { maxRequests: 50, windowMs: 60000 },
    },
    'upscale-image': {
      free: { maxRequests: 5, windowMs: 60000 },
      starter: { maxRequests: 10, windowMs: 60000 },
      pro: { maxRequests: 30, windowMs: 60000 },
    },
    'blend-images': {
      free: { maxRequests: 5, windowMs: 60000 },
      starter: { maxRequests: 10, windowMs: 60000 },
      pro: { maxRequests: 30, windowMs: 60000 },
    },
  };
  
  const actionConfig = configs[action] || {
    free: { maxRequests: 10, windowMs: 60000 },
    starter: { maxRequests: 20, windowMs: 60000 },
    pro: { maxRequests: 50, windowMs: 60000 },
  };
  
  return actionConfig[userTier] || actionConfig.free;
}
