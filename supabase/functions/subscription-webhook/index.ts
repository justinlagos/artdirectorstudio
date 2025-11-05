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

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.mode === 'subscription') {
        const userId = session.metadata?.user_id;
        const planName = session.metadata?.plan_name;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.error('No user_id in metadata');
          return new Response('No user_id', { status: 400 });
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();

        // Update user profile with subscription
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            is_pro: true,
            subscription_tier: planName || 'Pro',
            subscription_expires_at: expiresAt,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq('id', userId);

        if (error) {
          console.error('Error updating profile:', error);
          return new Response('Database error', { status: 500 });
        }

        console.log(`Subscription activated for user ${userId}`);
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Find user by customer ID
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (!profile) {
        console.error('No profile found for customer:', customerId);
        return new Response('Profile not found', { status: 404 });
      }

      const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
      const isActive = subscription.status === 'active';

      // Update subscription status
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          is_pro: isActive,
          subscription_expires_at: expiresAt,
        })
        .eq('id', profile.id);

      if (error) {
        console.error('Error updating subscription:', error);
        return new Response('Database error', { status: 500 });
      }

      console.log(`Subscription updated for user ${profile.id}`);
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Find user by customer ID
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (!profile) {
        console.error('No profile found for customer:', customerId);
        return new Response('Profile not found', { status: 404 });
      }

      // Deactivate subscription
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          is_pro: false,
          subscription_tier: 'free',
          subscription_expires_at: null,
        })
        .eq('id', profile.id);

      if (error) {
        console.error('Error deactivating subscription:', error);
        return new Response('Database error', { status: 500 });
      }

      console.log(`Subscription cancelled for user ${profile.id}`);
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
