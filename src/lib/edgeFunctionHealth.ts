/**
 * Edge Function Health Check Utility
 *
 * Monitors the health of Supabase edge functions by testing
 * CORS preflight requests. Use this to detect deployment issues
 * or connectivity problems early.
 */

export interface HealthCheckResult {
  function: string;
  healthy: boolean;
  responseTime?: number;
  error?: string;
  corsHeaders?: boolean;
}

export interface HealthCheckSummary {
  timestamp: Date;
  results: HealthCheckResult[];
  healthyCount: number;
  unhealthyCount: number;
  allHealthy: boolean;
}

/**
 * List of edge functions to monitor
 * Add new functions here as they're deployed
 */
const MONITORED_FUNCTIONS = [
  'documents',
  'actions',
  'assets',
  'generate-image',
  'analyze-image',
  'artie-chat',
  'edit-image',
  'blend-images',
  'upscale-image',
  'check-feature-access',
  'create-checkout-session',
  'create-subscription-checkout',
  'create-portal-session',
] as const;

/**
 * Check the health of a single edge function
 */
export async function checkFunctionHealth(
  functionName: string,
  timeoutMs = 5000
): Promise<HealthCheckResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !anonKey) {
    return {
      function: functionName,
      healthy: false,
      error: 'Missing Supabase configuration',
    };
  }

  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(
      `${supabaseUrl}/functions/v1/${functionName}`,
      {
        method: 'OPTIONS',
        headers: {
          'apikey': anonKey,
          'Origin': window.location.origin,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    const responseTime = Math.round(performance.now() - startTime);

    // Check for CORS headers
    const corsHeaders =
      response.headers.has('access-control-allow-origin') ||
      response.headers.has('Access-Control-Allow-Origin');

    // OPTIONS should return 204 or 200
    const healthy = response.ok || response.status === 204;

    return {
      function: functionName,
      healthy,
      responseTime,
      corsHeaders,
      error: healthy ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    const responseTime = Math.round(performance.now() - startTime);

    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      function: functionName,
      healthy: false,
      responseTime,
      error: errorMessage,
    };
  }
}

/**
 * Check the health of all monitored edge functions
 */
export async function checkAllEdgeFunctions(): Promise<HealthCheckSummary> {
  const results = await Promise.all(
    MONITORED_FUNCTIONS.map(name => checkFunctionHealth(name))
  );

  const healthyCount = results.filter(r => r.healthy).length;
  const unhealthyCount = results.length - healthyCount;

  return {
    timestamp: new Date(),
    results,
    healthyCount,
    unhealthyCount,
    allHealthy: unhealthyCount === 0,
  };
}

/**
 * Check specific edge functions
 */
export async function checkEdgeFunctions(
  functionNames: string[]
): Promise<HealthCheckSummary> {
  const results = await Promise.all(
    functionNames.map(name => checkFunctionHealth(name))
  );

  const healthyCount = results.filter(r => r.healthy).length;
  const unhealthyCount = results.length - healthyCount;

  return {
    timestamp: new Date(),
    results,
    healthyCount,
    unhealthyCount,
    allHealthy: unhealthyCount === 0,
  };
}

/**
 * Log health check results to console (for development)
 */
export function logHealthCheck(summary: HealthCheckSummary): void {
  console.group(`[Edge Functions Health Check] ${summary.timestamp.toISOString()}`);

  if (summary.allHealthy) {
    console.log(`✅ All ${summary.healthyCount} functions healthy`);
  } else {
    console.warn(`⚠️ ${summary.unhealthyCount}/${summary.results.length} functions unhealthy`);
  }

  summary.results.forEach(result => {
    if (result.healthy) {
      console.log(`  ✅ ${result.function} (${result.responseTime}ms)`);
    } else {
      console.error(`  ❌ ${result.function}: ${result.error}`);
    }
  });

  console.groupEnd();
}

/**
 * Run health check and log results (convenience function for dev)
 */
export async function runHealthCheck(): Promise<HealthCheckSummary> {
  const summary = await checkAllEdgeFunctions();
  logHealthCheck(summary);
  return summary;
}

/**
 * Get list of unhealthy functions
 */
export function getUnhealthyFunctions(summary: HealthCheckSummary): HealthCheckResult[] {
  return summary.results.filter(r => !r.healthy);
}

/**
 * Check if critical functions are healthy
 * These are functions that the app cannot work without
 */
export async function checkCriticalFunctions(): Promise<{
  healthy: boolean;
  issues: string[];
}> {
  const criticalFunctions = ['documents', 'generate-image', 'assets'];

  const results = await Promise.all(
    criticalFunctions.map(name => checkFunctionHealth(name))
  );

  const issues: string[] = [];

  results.forEach(result => {
    if (!result.healthy) {
      issues.push(`${result.function}: ${result.error || 'unhealthy'}`);
    }
    if (result.healthy && !result.corsHeaders) {
      issues.push(`${result.function}: missing CORS headers`);
    }
  });

  return {
    healthy: issues.length === 0,
    issues,
  };
}
