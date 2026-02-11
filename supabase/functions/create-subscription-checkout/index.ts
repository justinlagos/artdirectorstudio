import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log('[CREATE-SUBSCRIPTION-CHECKOUT] Request received');

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('[CREATE-SUBSCRIPTION-CHECKOUT] Missing Supabase env vars');
      throw new Error('Supabase configuration missing');
    }

    if (!stripeKey) {
      console.error('[CREATE-SUBSCRIPTION-CHECKOUT] Missing Stripe secret key');
      throw new Error('Stripe configuration missing');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[CREATE-SUBSCRIPTION-CHECKOUT] No authorization header');
      throw new Error('Authentication required');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('[CREATE-SUBSCRIPTION-CHECKOUT] Authenticating user...');

    const { data, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError) {
      console.error('[CREATE-SUBSCRIPTION-CHECKOUT] Auth error:', authError);
      throw new Error('Authentication failed: ' + authError.message);
    }

    const user = data.user;

    if (!user?.email) {
      console.error('[CREATE-SUBSCRIPTION-CHECKOUT] No user or email found');
      throw new Error('User not authenticated or email not available');
    }

    console.log('[CREATE-SUBSCRIPTION-CHECKOUT] User authenticated:', user.id);

    const { priceId, planName } = await req.json();

    console.log('[CREATE-SUBSCRIPTION-CHECKOUT] Request data:', { priceId, planName });

    if (!priceId) {
      throw new Error('Price ID required');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-11-20.acacia',
    });

    const origin = req.headers.get('origin') || 'http://localhost:8080';
    console.log('[CREATE-SUBSCRIPTION-CHECKOUT] Origin:', origin);

    // Check if customer exists
    console.log('[CREATE-SUBSCRIPTION-CHECKOUT] Checking for existing customer:', user.email);
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log('[CREATE-SUBSCRIPTION-CHECKOUT] Found existing customer:', customerId);
    } else {
      console.log('[CREATE-SUBSCRIPTION-CHECKOUT] No existing customer found');
    }

    // Create Checkout Session for subscription
    console.log('[CREATE-SUBSCRIPTION-CHECKOUT] Creating Stripe checkout session...');
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      metadata: {
        user_id: user.id,
        plan_name: planName,
      },
    });

    console.log('[CREATE-SUBSCRIPTION-CHECKOUT] Checkout session created:', session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[CREATE-SUBSCRIPTION-CHECKOUT] Error:', error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
