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
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    logRequest(req.method, '/deduct-credits', correlationId);
    
    // Validate environment
    validateEnvVars(['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'], correlationId);

    // Extract user ID from JWT
    const userId = extractUserIdFromJWT(req.headers.get('Authorization'), correlationId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // Create admin client for later use
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, provider, request_id } = await req.json();

    console.log(`[${correlationId}] Deducting credits for:`, { userId, action, provider, request_id });

    // Validate input
    if (!action || !provider) {
      return createErrorResponse(
        new Error('Action and provider are required'),
        correlationId,
        400,
        'INVALID_INPUT'
      );
    }

    // Get pricing configuration
    const { data: pricingData, error: pricingError } = await supabaseClient
      .from('pricing_config')
      .select('credits')
      .eq('action', action)
      .eq('provider', provider)
      .single();

    if (pricingError || !pricingData) {
      console.error(`[${correlationId}] Pricing lookup error:`, pricingError);
      return createErrorResponse(
        new Error('Invalid action or provider'),
        correlationId,
        400,
        'INVALID_PRICING'
      );
    }

    const creditsRequired = pricingData.credits;

    // IDEMPOTENCY CHECK: If request_id provided, check if already processed
    if (request_id) {
      const { data: existingTransaction, error: txCheckError } = await supabaseAdmin
        .from('credit_transactions')
        .select('id, amount')
        .eq('user_id', userId)
        .contains('description', request_id)
        .maybeSingle();

      if (txCheckError) {
        console.warn(`[${correlationId}] Error checking existing transaction:`, txCheckError);
      }

      if (existingTransaction) {
        console.log(`[${correlationId}] Request ${request_id} already processed. Returning cached result.`);
        
        // Get current balance
        const { data: currentBalance } = await supabaseClient
          .from('credits')
          .select('balance')
          .eq('user_id', userId)
          .maybeSingle();

        return createSuccessResponse(
          {
            success: true,
            credits_deducted: Math.abs(existingTransaction.amount),
            remaining_balance: currentBalance?.balance || 0,
            already_processed: true,
          },
          correlationId
        );
      }
    }

    // Check current balance
    let { data: currentBalance, error: balanceError } = await supabaseClient
      .from('credits')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (balanceError) {
      console.error(`[${correlationId}] Balance check error:`, balanceError);
      return createErrorResponse(
        new Error('Failed to check credit balance'),
        correlationId,
        500,
        'BALANCE_CHECK_FAILED'
      );
    }

    // If no credits record exists, create one with default balance
    if (!currentBalance) {
      console.log(`[${correlationId}] Creating credits record for user ${userId}`);
      const { error: createError } = await supabaseAdmin
        .from('credits')
        .insert({ user_id: userId, balance: 50 });
      
      if (createError) {
        console.error(`[${correlationId}] Failed to create credits record:`, createError);
        return createErrorResponse(
          new Error('Failed to initialize credit balance'),
          correlationId,
          500,
          'CREDIT_INIT_FAILED'
        );
      }
      
      // Set balance to 50 for the deduction check
      currentBalance = { balance: 50 };
    }

    if (currentBalance.balance < creditsRequired) {
      console.log(`[${correlationId}] Insufficient credits:`, {
        required: creditsRequired,
        available: currentBalance.balance
      });
      return createErrorResponse(
        new Error(`Insufficient credits. Required: ${creditsRequired}, Available: ${currentBalance.balance}`),
        correlationId,
        402,
        'INSUFFICIENT_CREDITS'
      );
    }

    // Deduct credits
    const { error: deductError } = await supabaseAdmin
      .from('credits')
      .update({ balance: currentBalance.balance - creditsRequired })
      .eq('user_id', userId);

    if (deductError) {
      console.error(`[${correlationId}] Deduction error:`, deductError);
      return createErrorResponse(
        new Error('Failed to deduct credits'),
        correlationId,
        500,
        'DEDUCTION_FAILED'
      );
    }

    // Log transaction (best-effort, don't fail if this errors)
    try {
      const description = request_id 
        ? `Deducted via ${action} (${provider}) - Request ID: ${request_id} - Correlation ID: ${correlationId}`
        : `Deducted via ${action} (${provider}) - Correlation ID: ${correlationId}`;
      
      await supabaseAdmin
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: -creditsRequired,
          action,
          provider,
          description,
        });
    } catch (txError) {
      console.warn(`[${correlationId}] Transaction log warning:`, txError);
    }

    const newBalance = currentBalance.balance - creditsRequired;
    console.log(`[${correlationId}] Credits deducted successfully:`, {
      deducted: creditsRequired,
      newBalance
    });

    return createSuccessResponse(
      {
        success: true,
        credits_deducted: creditsRequired,
        remaining_balance: newBalance,
      },
      correlationId
    );

  } catch (error) {
    return createErrorResponse(error, correlationId);
  }
});
