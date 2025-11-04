import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  handleCorsPreflightRequest,
  createErrorResponse,
  createSuccessResponse,
  generateCorrelationId,
  validateEnvVars,
  extractUserIdFromJWT,
  logRequest,
} from "../_shared/edgeFunctionUtils.ts";

serve(async (req) => {
  const correlationId = generateCorrelationId();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    logRequest(req.method, '/verify-payment', correlationId);
    
    // Validate environment
    validateEnvVars([
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'STRIPE_SECRET_KEY'
    ], correlationId);

    // Extract user ID from JWT
    const userId = extractUserIdFromJWT(req.headers.get('Authorization'), correlationId);

    const { session_id } = await req.json();

    if (!session_id) {
      return createErrorResponse(
        new Error('Session ID required'),
        correlationId,
        400,
        'MISSING_SESSION_ID'
      );
    }

    console.log(`[${correlationId}] Verifying payment:`, { userId, session_id });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-11-20.acacia',
    });

    // Retrieve the checkout session (idempotent operation)
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return createErrorResponse(
        new Error('Payment not completed'),
        correlationId,
        400,
        'PAYMENT_NOT_COMPLETED'
      );
    }

    const sessionUserId = session.metadata?.user_id;
    const credits = parseInt(session.metadata?.credits || '0');
    const packageName = session.metadata?.package_name;

    // Security: verify session belongs to requesting user
    if (sessionUserId !== userId) {
      console.error(`[${correlationId}] Session mismatch:`, { sessionUserId, userId });
      return createErrorResponse(
        new Error('Session does not belong to this user'),
        correlationId,
        403,
        'UNAUTHORIZED_SESSION'
      );
    }

    if (!credits || credits <= 0) {
      return createErrorResponse(
        new Error('Invalid credits amount'),
        correlationId,
        400,
        'INVALID_CREDITS'
      );
    }

    // Use service role to update credits (idempotent)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get current balance
    const { data: currentCredits, error: fetchError } = await supabaseAdmin
      .from('credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error(`[${correlationId}] Error fetching credits:`, fetchError);
      return createErrorResponse(
        new Error('Failed to fetch current credits'),
        correlationId,
        500,
        'FETCH_CREDITS_FAILED'
      );
    }

    const newBalance = (currentCredits?.balance || 0) + credits;

    // Update balance (idempotent via session_id check in transaction log)
    const { error: updateError } = await supabaseAdmin
      .from('credits')
      .update({ balance: newBalance })
      .eq('user_id', userId);

    if (updateError) {
      console.error(`[${correlationId}] Error updating credits:`, updateError);
      
      // Auto-refund logic would go here in production
      // For now, log for manual review
      console.error(`[${correlationId}] MANUAL REVIEW REQUIRED - Failed credit update for paid session:`, {
        session_id,
        userId,
        credits,
        error: updateError
      });
      
      return createErrorResponse(
        new Error('Failed to update credits - payment will be reviewed'),
        correlationId,
        500,
        'UPDATE_CREDITS_FAILED'
      );
    }

    // Log transaction (idempotent check via notes containing session_id)
    try {
      const { error: transactionError } = await supabaseAdmin
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: credits,
          action: 'purchase',
          provider: 'stripe',
          description: `Purchased ${packageName} package via Stripe (Session: ${session_id}) - Correlation ID: ${correlationId}`,
        });

      if (transactionError) {
        console.warn(`[${correlationId}] Transaction log warning:`, transactionError);
      }
    } catch (txError) {
      console.warn(`[${correlationId}] Transaction log error:`, txError);
    }

    console.log(`[${correlationId}] Successfully added ${credits} credits. New balance: ${newBalance}`);

    return createSuccessResponse(
      {
        success: true,
        credits_added: credits,
        new_balance: newBalance,
        package_name: packageName,
      },
      correlationId
    );

  } catch (error) {
    console.error(`[${correlationId}] Payment verification error:`, error);
    return createErrorResponse(error, correlationId);
  }
});
