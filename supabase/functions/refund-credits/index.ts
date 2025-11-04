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
    logRequest(req.method, '/refund-credits', correlationId);
    validateEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], correlationId);

    const userId = extractUserIdFromJWT(req.headers.get('Authorization'), correlationId);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { request_id, reason } = await req.json();

    console.log(`[${correlationId}] Refunding credits:`, { userId, request_id, reason });

    if (!request_id || !reason) {
      return createErrorResponse(
        new Error('Missing request_id or reason'),
        correlationId,
        400,
        'INVALID_INPUT'
      );
    }

    // Find original transaction
    const { data: transaction, error: fetchError } = await supabaseAdmin
      .from('credit_transactions')
      .select('id, status, amount, action, provider')
      .eq('user_id', userId)
      .eq('request_id', request_id)
      .maybeSingle();

    if (fetchError || !transaction) {
      return createErrorResponse(
        new Error('Transaction not found'),
        correlationId,
        404,
        'TRANSACTION_NOT_FOUND'
      );
    }

    if (transaction.status === 'refunded') {
      console.log(`[${correlationId}] Transaction already refunded`);
      return createSuccessResponse(
        {
          success: true,
          already_refunded: true,
        },
        correlationId
      );
    }

    const refundAmount = Math.abs(transaction.amount);

    // Get current balance
    const { data: currentBalance } = await supabaseAdmin
      .from('credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (!currentBalance) {
      return createErrorResponse(
        new Error('User balance not found'),
        correlationId,
        404,
        'BALANCE_NOT_FOUND'
      );
    }

    // Refund credits
    const { error: refundError } = await supabaseAdmin
      .from('credits')
      .update({ balance: currentBalance.balance + refundAmount })
      .eq('user_id', userId);

    if (refundError) {
      return createErrorResponse(
        new Error('Failed to refund credits'),
        correlationId,
        500,
        'REFUND_FAILED'
      );
    }

    // Mark original as refunded
    await supabaseAdmin
      .from('credit_transactions')
      .update({
        status: 'refunded',
        completed_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    // Create refund transaction record
    const { error: txError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: refundAmount,
        action: transaction.action,
        provider: transaction.provider,
        status: 'completed',
        request_id: `${request_id}_refund`,
        description: `Refund: ${reason} - Correlation ID: ${correlationId}`,
        completed_at: new Date().toISOString(),
      });

    if (txError) {
      console.error(`[${correlationId}] Failed to log refund transaction:`, txError);
    }

    const newBalance = currentBalance.balance + refundAmount;
    console.log(`[${correlationId}] Credits refunded successfully:`, {
      refunded: refundAmount,
      newBalance
    });

    return createSuccessResponse(
      {
        success: true,
        credits_refunded: refundAmount,
        new_balance: newBalance,
        reason,
      },
      correlationId
    );

  } catch (error) {
    return createErrorResponse(error, correlationId);
  }
});
