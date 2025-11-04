import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    logRequest(req.method, '/reserve-credits', correlationId);
    validateEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], correlationId);

    const userId = extractUserIdFromJWT(req.headers.get('Authorization'), correlationId);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { amount, action, provider, request_id } = await req.json();

    console.log(`[${correlationId}] Reserving credits:`, { userId, amount, action, provider, request_id });

    if (!amount || !action || !provider || !request_id) {
      return createErrorResponse(
        new Error('Missing required fields: amount, action, provider, request_id'),
        correlationId,
        400,
        'INVALID_INPUT'
      );
    }

    // IDEMPOTENCY CHECK: If already reserved, return cached result
    const { data: existingTx } = await supabaseAdmin
      .from('credit_transactions')
      .select('id, amount, status')
      .eq('user_id', userId)
      .eq('request_id', request_id)
      .maybeSingle();

    if (existingTx) {
      console.log(`[${correlationId}] Request ${request_id} already reserved`);
      
      const { data: balance } = await supabaseAdmin
        .from('credits')
        .select('balance')
        .eq('user_id', userId)
        .single();

      return createSuccessResponse(
        {
          success: true,
          credits_reserved: Math.abs(existingTx.amount),
          remaining_balance: balance?.balance || 0,
          already_processed: true,
        },
        correlationId
      );
    }

    // Check current balance
    const { data: currentBalance, error: balanceError } = await supabaseAdmin
      .from('credits')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (balanceError) {
      return createErrorResponse(
        new Error('Failed to check balance'),
        correlationId,
        500,
        'BALANCE_CHECK_FAILED'
      );
    }

    if (!currentBalance || currentBalance.balance < amount) {
      return createErrorResponse(
        new Error(`Insufficient credits. Required: ${amount}, Available: ${currentBalance?.balance || 0}`),
        correlationId,
        402,
        'INSUFFICIENT_CREDITS'
      );
    }

    // Deduct credits
    const { error: deductError } = await supabaseAdmin
      .from('credits')
      .update({ balance: currentBalance.balance - amount })
      .eq('user_id', userId);

    if (deductError) {
      return createErrorResponse(
        new Error('Failed to reserve credits'),
        correlationId,
        500,
        'RESERVATION_FAILED'
      );
    }

    // Log pending transaction
    const { error: txError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: -amount,
        action,
        provider,
        status: 'pending',
        request_id,
        description: `Reserved for ${action} operation - Correlation ID: ${correlationId}`,
      });

    if (txError) {
      console.error(`[${correlationId}] Failed to log reservation:`, txError);
      // Rollback credit deduction
      await supabaseAdmin
        .from('credits')
        .update({ balance: currentBalance.balance })
        .eq('user_id', userId);

      return createErrorResponse(
        new Error('Failed to log reservation'),
        correlationId,
        500,
        'TRANSACTION_LOG_FAILED'
      );
    }

    const newBalance = currentBalance.balance - amount;
    console.log(`[${correlationId}] Credits reserved successfully:`, {
      reserved: amount,
      newBalance
    });

    return createSuccessResponse(
      {
        success: true,
        credits_reserved: amount,
        remaining_balance: newBalance,
      },
      correlationId
    );

  } catch (error) {
    return createErrorResponse(error, correlationId);
  }
});
