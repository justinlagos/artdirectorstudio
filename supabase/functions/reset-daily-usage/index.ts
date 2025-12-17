import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[RESET-DAILY-USAGE] Starting daily usage reset job...');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    console.log('[RESET-DAILY-USAGE] Current time:', now.toISOString());

    // Find all Starter users whose daily_usage_reset_at has passed
    const { data: usersToReset, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, daily_usage, daily_limit, daily_usage_reset_at')
      .eq('subscription_tier', 'starter')
      .lte('daily_usage_reset_at', now.toISOString());

    if (fetchError) {
      console.error('[RESET-DAILY-USAGE] Error fetching users:', fetchError);
      throw fetchError;
    }

    console.log(`[RESET-DAILY-USAGE] Found ${usersToReset?.length || 0} users to reset`);

    if (!usersToReset || usersToReset.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No users needed reset',
          resetCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset all eligible users
    const userIds = usersToReset.map(u => u.id);

    // Calculate next reset time (next UTC midnight)
    const nextResetTime = new Date(now);
    nextResetTime.setUTCDate(nextResetTime.getUTCDate() + 1);
    nextResetTime.setUTCHours(0, 0, 0, 0);
    const nextResetIso = nextResetTime.toISOString();

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        daily_usage: 0,
        daily_usage_reset_at: nextResetIso
      })
      .in('id', userIds);

    if (updateError) {
      console.error('[RESET-DAILY-USAGE] Error resetting users:', updateError);
      throw updateError;
    }

    console.log(`[RESET-DAILY-USAGE] Successfully reset ${usersToReset.length} users`);
    console.log('[RESET-DAILY-USAGE] Next reset scheduled for:', nextResetTime);

    // Log each user reset for debugging
    usersToReset.forEach(user => {
      console.log(`[RESET-DAILY-USAGE] Reset user ${user.email}: ${user.daily_usage}/${user.daily_limit} -> 0/${user.daily_limit}`);
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reset ${usersToReset.length} users`,
        resetCount: usersToReset.length,
        nextReset: nextResetTime,
        users: usersToReset.map(u => u.email)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[RESET-DAILY-USAGE] Fatal error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
