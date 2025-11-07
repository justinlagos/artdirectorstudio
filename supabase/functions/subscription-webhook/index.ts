import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    console.log('Webhook event type:', event.type);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle successful checkout
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      
      // Get subscription details to find the price
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0].price.id;
      const productId = subscription.items.data[0].price.product as string;
      
      // Map price IDs to tiers
      let tier = 'starter';
      let dailyLimit = 10;
      
      if (priceId === 'price_1SQqaNBOqYfTntNB5NF0eqFr' || productId === 'prod_TNbnpk8TQPKkOI') {
        tier = 'starter';
        dailyLimit = 10;
      } else if (priceId === 'price_1SQqbLBOqYfTntNBjhHl91uA' || productId === 'prod_TNboMvg65fjVIr') {
        tier = 'pro';
        dailyLimit = 999999; // Unlimited
      } else if (priceId === 'price_1SQqblBOqYfTntNBDB0wrK6Q' || productId === 'prod_TNbpDSX3jWb5GH') {
        tier = 'enterprise';
        dailyLimit = 999999; // Unlimited
      }

      // Update user profile
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_pro: tier !== 'starter',
          subscription_tier: tier,
          subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          daily_limit: dailyLimit,
          daily_usage: 0,
          daily_usage_reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('stripe_customer_id', customerId);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw updateError;
      }

      // Log billing event
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        await supabaseAdmin.from('billing_events').insert({
          user_id: profile.id,
          event_type: 'subscription_charge',
          amount_cents: subscription.items.data[0].price.unit_amount || 0,
          currency: subscription.currency,
          stripe_subscription_id: subscriptionId,
          stripe_invoice_id: subscription.latest_invoice as string,
          metadata: { tier, plan: tier },
          status: 'completed',
        });
      }

      console.log('Successfully updated profile for subscription:', subscriptionId, 'Tier:', tier);
    }

    // Handle subscription updates
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;
      const priceId = subscription.items.data[0].price.id;
      const productId = subscription.items.data[0].price.product as string;

      let tier = 'starter';
      let dailyLimit = 10;
      
      if (priceId === 'price_1SQqaNBOqYfTntNB5NF0eqFr' || productId === 'prod_TNbnpk8TQPKkOI') {
        tier = 'starter';
        dailyLimit = 10;
      } else if (priceId === 'price_1SQqbLBOqYfTntNBjhHl91uA' || productId === 'prod_TNboMvg65fjVIr') {
        tier = 'pro';
        dailyLimit = 999999;
      } else if (priceId === 'price_1SQqblBOqYfTntNBDB0wrK6Q' || productId === 'prod_TNbpDSX3jWb5GH') {
        tier = 'enterprise';
        dailyLimit = 999999;
      }

      // Update subscription expiry date and tier
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
          is_pro: subscription.status === 'active' && tier !== 'starter',
          subscription_tier: tier,
          daily_limit: dailyLimit,
        })
        .eq('stripe_customer_id', customerId);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        throw updateError;
      }

      console.log('Successfully updated subscription for customer:', customerId, 'Tier:', tier);
    }

    // Handle subscription cancellation
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;

      // Get user profile for billing event
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      // Deactivate subscription
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_pro: false,
          subscription_tier: 'free',
          subscription_expires_at: null,
          daily_limit: 10,
          daily_usage: 0,
        })
        .eq('stripe_customer_id', customerId);

      if (updateError) {
        console.error('Error deactivating subscription:', updateError);
        throw updateError;
      }

      // Log cancellation event
      if (profile) {
        await supabaseAdmin.from('billing_events').insert({
          user_id: profile.id,
          event_type: 'subscription_cancel',
          amount_cents: 0,
          stripe_subscription_id: subscription.id,
          status: 'completed',
        });
      }

      console.log('Successfully deactivated subscription for customer:', customerId);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
