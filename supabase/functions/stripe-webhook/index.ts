import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Server-side price ID to credits mapping (matches verify-payment)
const PLAN_CREDITS: Record<string, { credits: number; name: string }> = {
  'price_1SOzqZBOqYfTntNBPPmRVqCB': { credits: 10, name: 'Starter' },
  'price_1SOzr0BOqYfTntNBih2xnB1Y': { credits: 50, name: 'Pro' },
  'price_1SOzrGBOqYfTntNBCF49yTpu': { credits: 100, name: 'Business' },
  'price_1SOzrUBOqYfTntNBAfYNELS7': { credits: 500, name: 'Enterprise' },
};

serve(async (req) => {
  // Webhooks don't need CORS
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('[Webhook] Missing stripe-signature header');
      return new Response('Missing signature', { status: 400 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!stripeKey || !webhookSecret) {
      console.error('[Webhook] Missing Stripe configuration');
      return new Response('Server configuration error', { status: 500 });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });

    // Get raw body for signature verification
    const body = await req.text();
    
    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[Webhook] Signature verification failed:', err);
      return new Response(`Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`, { 
        status: 400 
      });
    }

    console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // IDEMPOTENCY CHECK: Check if event already processed
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('id, status, credits_purchased')
      .eq('stripe_event_id', event.id)
      .maybeSingle();

    if (existingPayment) {
      console.log(`[Webhook] Event ${event.id} already processed. Status: ${existingPayment.status}`);
      return new Response(JSON.stringify({ 
        received: true, 
        duplicate: true,
        message: 'Event already processed' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Expand line items to get price_id
      const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items'],
      });

      const priceId = expandedSession.line_items?.data[0]?.price?.id;
      const userId = session.metadata?.user_id;
      const packageName = session.metadata?.package_name;

      if (!priceId || !userId) {
        console.error('[Webhook] Missing required metadata:', { priceId, userId });
        return new Response('Missing metadata', { status: 400 });
      }

      const planConfig = PLAN_CREDITS[priceId];
      if (!planConfig) {
        console.error('[Webhook] Invalid price ID:', priceId);
        return new Response('Invalid price configuration', { status: 400 });
      }

      const { credits, name } = planConfig;
      const amountCents = session.amount_total || 0;

      console.log(`[Webhook] Processing payment for user ${userId}: ${credits} credits from ${packageName || name}`);

      // Create payment record FIRST (serves as idempotency lock)
      const { error: paymentError } = await supabaseAdmin
        .from('payments')
        .insert({
          stripe_payment_intent: session.payment_intent as string,
          stripe_event_id: event.id,
          user_id: userId,
          package_name: packageName || name,
          credits_purchased: credits,
          amount_cents: amountCents,
          currency: session.currency || 'usd',
          status: 'completed',
          completed_at: new Date().toISOString(),
        });

      if (paymentError) {
        console.error('[Webhook] Failed to create payment record:', paymentError);
        // If this is a duplicate key error, the event was already processed
        if (paymentError.code === '23505') {
          console.log('[Webhook] Duplicate event detected via payment insert');
          return new Response(JSON.stringify({ 
            received: true, 
            duplicate: true 
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('Failed to create payment record', { status: 500 });
      }

      // Get current balance
      const { data: currentBalance } = await supabaseAdmin
        .from('credits')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (!currentBalance) {
        console.error('[Webhook] User credits record not found');
        return new Response('User not found', { status: 404 });
      }

      const newBalance = currentBalance.balance + credits;

      // Update credits
      const { error: updateError } = await supabaseAdmin
        .from('credits')
        .update({ balance: newBalance })
        .eq('user_id', userId);

      if (updateError) {
        console.error('[Webhook] Failed to update credits:', updateError);
        return new Response('Failed to update credits', { status: 500 });
      }

      // Log transaction
      const { error: txError } = await supabaseAdmin
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: credits,
          action: 'purchase',
          provider: 'stripe',
          status: 'completed',
          request_id: event.id,
          description: `Webhook: Purchased ${packageName || name} package (${credits} credits)`,
          completed_at: new Date().toISOString(),
        });

      if (txError) {
        console.error('[Webhook] Failed to log transaction:', txError);
        // Non-fatal - credits were added
      }

      console.log(`[Webhook] Successfully processed payment: ${credits} credits added. New balance: ${newBalance}`);

      return new Response(JSON.stringify({ 
        received: true,
        credits_added: credits,
        new_balance: newBalance,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle other event types
    console.log(`[Webhook] Unhandled event type: ${event.type}`);
    return new Response(JSON.stringify({ 
      received: true,
      message: `Unhandled event type: ${event.type}` 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Webhook] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
