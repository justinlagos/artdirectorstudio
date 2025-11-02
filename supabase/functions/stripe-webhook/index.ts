import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2023-10-16',
  });

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  let event: Stripe.Event;

  try {
    const body = await req.text();
    
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
    } else {
      // For testing without webhook secret
      event = JSON.parse(body);
    }

    console.log('Webhook event received:', event.type);

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.metadata?.user_id;
      const credits = parseInt(session.metadata?.credits || '0');
      const packageName = session.metadata?.package_name;

      if (!userId || !credits) {
        throw new Error('Missing user_id or credits in session metadata');
      }

      console.log(`Processing payment for user ${userId}: ${credits} credits`);

      // Use service role key to update credits
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Add credits to user's balance
      const { data: currentCredits, error: fetchError } = await supabaseAdmin
        .from('credits')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching current credits:', fetchError);
        throw fetchError;
      }

      const newBalance = (currentCredits?.balance || 0) + credits;

      const { error: updateError } = await supabaseAdmin
        .from('credits')
        .update({ balance: newBalance })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating credits:', updateError);
        throw updateError;
      }

      // Log the transaction
      const { error: transactionError } = await supabaseAdmin
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: credits,
          action: 'purchase',
          provider: 'stripe',
          notes: `Purchased ${packageName} package via Stripe (Session: ${session.id})`,
        });

      if (transactionError) {
        console.error('Error logging transaction:', transactionError);
        throw transactionError;
      }

      console.log(`Successfully added ${credits} credits to user ${userId}. New balance: ${newBalance}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
