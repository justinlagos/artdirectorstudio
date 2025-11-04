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
    logRequest(req.method, '/commit-credits', correlationId);
    validateEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], correlationId);

    const userId = extractUserIdFromJWT(req.headers.get('Authorization'), correlationId);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { request_id } = await req.json();

    console.log(`[${correlationId}] Committing credits for request:`, { userId, request_id });

    if (!request_id) {
      return createErrorResponse(
        new Error('Missing request_id'),
        correlationId,
        400,
        'INVALID_INPUT'
      );
    }

    // Find pending transaction
    const { data: transaction, error: fetchError } = await supabaseAdmin
      .from('credit_transactions')
      .select('id, status, amount')
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

    if (transaction.status === 'completed') {
      console.log(`[${correlationId}] Transaction already completed`);
      return createSuccessResponse(
        {
          success: true,
          already_completed: true,
        },
        correlationId
      );
    }

    // Mark as completed
    const { error: updateError } = await supabaseAdmin
      .from('credit_transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        description: `Completed successfully - Correlation ID: ${correlationId}`,
      })
      .eq('id', transaction.id);

    if (updateError) {
      return createErrorResponse(
        new Error('Failed to commit transaction'),
        correlationId,
        500,
        'COMMIT_FAILED'
      );
    }

    console.log(`[${correlationId}] Credits committed successfully`);

    return createSuccessResponse(
      {
        success: true,
        credits_committed: Math.abs(transaction.amount),
      },
      correlationId
    );

  } catch (error) {
    return createErrorResponse(error, correlationId);
  }
});
