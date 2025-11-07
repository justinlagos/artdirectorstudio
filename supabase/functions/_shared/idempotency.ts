import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

/**
 * Idempotency helper to prevent duplicate requests
 */
export async function checkIdempotency(
  supabaseUrl: string,
  serviceRoleKey: string,
  key: string
): Promise<{ cached: boolean; response?: any }> {
  if (!key) {
    return { cached: false };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Check if we have a cached response
  const { data, error } = await supabase
    .from('idempotency_cache')
    .select('response, expires_at')
    .eq('key', key)
    .single();

  if (error || !data) {
    return { cached: false };
  }

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    // Delete expired entry
    await supabase.from('idempotency_cache').delete().eq('key', key);
    return { cached: false };
  }

  return { cached: true, response: data.response };
}

/**
 * Cache a response for idempotency
 */
export async function cacheResponse(
  supabaseUrl: string,
  serviceRoleKey: string,
  key: string,
  response: any,
  ttlSeconds: number = 3600
): Promise<void> {
  if (!key) return;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + ttlSeconds);

  await supabase
    .from('idempotency_cache')
    .upsert({
      key,
      response,
      expires_at: expiresAt.toISOString()
    }, {
      onConflict: 'key'
    });
}
