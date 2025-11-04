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

// Server-side price ID to credits mapping (single source of truth)
const PLAN_CREDITS: Record<string, number> = {
  'price_1SOzqZBOqYfTntNBPPmRVqCB': 10,   // Starter - $5
  'price_1SOzr0BOqYfTntNBih2xnB1Y': 50,   // Pro - $20
  'price_1SOzrGBOqYfTntNBCF49yTpu': 100,  // Business - $35
  'price_1SOzrUBOqYfTntNBAfYNELS7': 500,  // Enterprise - $150
};

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
      apiVersion: '2025-08-27.basil',
    });

    // Retrieve the checkout session with line items (idempotent operation)
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items'],
    });

    if (session.payment_status !== 'paid') {
      return createErrorResponse(
        new Error('Payment not completed'),
        correlationId,
        400,
        'PAYMENT_NOT_COMPLETED'
      );
    }

    const sessionUserId = session.metadata?.user_id;
    const packageName = session.metadata?.package_name;
    
    // Get price_id from line items to determine credits (server-side mapping)
    const priceId = session.line_items?.data[0]?.price?.id;
    if (!priceId || !PLAN_CREDITS[priceId]) {
      console.error(`[${correlationId}] Invalid or unmapped price ID:`, priceId);
      return createErrorResponse(
        new Error('Invalid pricing configuration'),
        correlationId,
        400,
        'INVALID_PRICE_ID'
      );
    }
    
    const credits = PLAN_CREDITS[priceId];
    console.log(`[${correlationId}] Price ID ${priceId} mapped to ${credits} credits`);

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

    // Use service role to update credits
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // IDEMPOTENCY CHECK: Verify this session hasn't been processed already
    const { data: existingTransaction, error: txCheckError } = await supabaseAdmin
      .from('credit_transactions')
      .select('id, amount')
      .eq('user_id', userId)
      .contains('description', session_id)
      .maybeSingle();

    if (txCheckError) {
      console.error(`[${correlationId}] Error checking existing transaction:`, txCheckError);
    }

    if (existingTransaction) {
      console.log(`[${correlationId}] Session ${session_id} already processed. Returning cached result.`);
      
      // Get current balance
      const { data: currentCredits, error: fetchError } = await supabaseAdmin
        .from('credits')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        console.error(`[${correlationId}] Error fetching credits:`, fetchError);
      }

      return createSuccessResponse(
        {
          success: true,
          credits_added: existingTransaction.amount,
          new_balance: currentCredits?.balance || 0,
          package_name: packageName,
          already_processed: true,
        },
        correlationId
      );
    }

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

    // Log transaction FIRST (serves as idempotency record)
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
      console.error(`[${correlationId}] Failed to log transaction:`, transactionError);
      return createErrorResponse(
        new Error('Failed to record transaction'),
        correlationId,
        500,
        'TRANSACTION_LOG_FAILED'
      );
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
