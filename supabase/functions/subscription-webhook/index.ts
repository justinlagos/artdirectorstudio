import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

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

      // Handle one-time payments (Credit Packs)
      if (session.mode === 'payment') {
        const userId = session.metadata?.user_id;
        const credits = parseInt(session.metadata?.credits || '0');
        const packageName = session.metadata?.package_name;

        console.log(`Processing one-time payment for user ${userId}: ${credits} credits (${packageName})`);

        if (userId && credits > 0) {
          // Get current balance
          const { data: currentCredits } = await supabaseAdmin
            .from('credits')
            .select('balance')
            .eq('user_id', userId)
            .maybeSingle();

          const newBalance = (currentCredits?.balance || 0) + credits;

          // Update credits
          const { error: updateError } = await supabaseAdmin
            .from('credits')
            .upsert({
              user_id: userId,
              balance: newBalance,
              updated_at: new Date().toISOString()
            });

          if (updateError) {
            console.error('Error updating credits via webhook:', updateError);
            throw updateError;
          }

          // Log transaction
          await supabaseAdmin
            .from('credit_transactions')
            .insert({
              user_id: userId,
              amount: credits,
              action: 'purchase',
              provider: 'stripe',
              notes: `Purchased ${packageName} package via Stripe Webhook (Session: ${session.id})`,
            });

          // Log billing event
          await supabaseAdmin.from('billing_events').insert({
            user_id: userId,
            event_type: 'credit_purchase',
            amount_cents: session.amount_total || 0,
            currency: session.currency || 'usd',
            stripe_payment_intent: session.payment_intent as string,
            metadata: { credits, package: packageName },
            status: 'completed',
          });

          console.log(`Successfully added ${credits} credits to user ${userId}`);
        }

        // Return early for payment mode
        return new Response(JSON.stringify({ received: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Handle Subscriptions
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const customerEmail = session.customer_details?.email;

      if (!customerEmail) {
        console.error('No customer email found in session');
        throw new Error('Customer email is required');
      }

      const userId = session.metadata?.user_id;
      console.log('Processing checkout for email:', customerEmail, 'User ID:', userId);

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

      console.log('Mapped tier:', tier, 'for price:', priceId);

      const expiresAt = new Date(subscription.current_period_end * 1000);
      console.log('Subscription expires at:', expiresAt.toISOString(), '(from Stripe:', subscription.current_period_end, ')');

      // Calculate next midnight for daily reset to prevent drift
      const nextMidnight = new Date();
      nextMidnight.setUTCHours(24, 0, 0, 0);

      // Update user profile by user_id if available, otherwise by EMAIL
      let query = supabaseAdmin
        .from('profiles')
        .update({
          is_pro: tier !== 'starter',
          subscription_tier: tier,
          subscription_expires_at: expiresAt.toISOString(),
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          daily_limit: dailyLimit,
          daily_usage: 0,
          daily_usage_reset_at: nextMidnight.toISOString(),
        });

      if (userId) {
        query = query.eq('id', userId);
      } else {
        query = query.eq('email', customerEmail);
      }

      const { data: updatedProfile, error: updateError } = await query.select();

      if (updateError) {
        console.error('Error updating profile:', updateError);

        // Log webhook error to billing_events
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', customerEmail)
          .single();

        if (userProfile) {
          await supabaseAdmin.from('billing_events').insert({
            user_id: userProfile.id,
            event_type: 'webhook_error',
            amount_cents: subscription.items.data[0].price.unit_amount || 0,
            stripe_subscription_id: subscriptionId,
            metadata: {
              error: updateError.message,
              tier,
              priceId,
              email: customerEmail,
            },
            status: 'failed',
          });
        }

        throw updateError;
      }

      // Check if profile was actually updated
      if (!updatedProfile || updatedProfile.length === 0) {
        console.error('Profile update affected 0 rows for email:', customerEmail);

        // Log webhook error
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', customerEmail)
          .single();

        if (userProfile) {
          await supabaseAdmin.from('billing_events').insert({
            user_id: userProfile.id,
            event_type: 'webhook_error',
            amount_cents: subscription.items.data[0].price.unit_amount || 0,
            stripe_subscription_id: subscriptionId,
            metadata: {
              error: 'Profile update affected 0 rows',
              tier,
              priceId,
              email: customerEmail,
            },
            status: 'failed',
          });
        }

        throw new Error('Profile not found for email: ' + customerEmail);
      }

      console.log('Successfully updated profile for:', customerEmail, 'Tier:', tier);

      // Log billing event
      const profile = updatedProfile[0];
      if (profile) {
        await supabaseAdmin.from('billing_events').insert({
          user_id: profile.id,
          event_type: 'subscription_charge',
          amount_cents: subscription.items.data[0].price.unit_amount || 0,
          currency: subscription.currency,
          stripe_subscription_id: subscriptionId,
          stripe_invoice_id: subscription.latest_invoice as string,
          metadata: { tier, plan: tier, priceId, email: customerEmail },
          status: 'completed',
        });
      }

      console.log('Billing event logged for subscription:', subscriptionId);
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
