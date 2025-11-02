import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error('Session ID required');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    const userId = session.metadata?.user_id;
    const credits = parseInt(session.metadata?.credits || '0');
    const packageName = session.metadata?.package_name;

    if (userId !== user.id) {
      throw new Error('Session does not belong to this user');
    }

    if (!credits) {
      throw new Error('Invalid credits amount');
    }

    // Use service role to update credits
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current balance
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

    // Update balance
    const { error: updateError } = await supabaseAdmin
      .from('credits')
      .update({ balance: newBalance })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating credits:', updateError);
      throw updateError;
    }

    // Log transaction
    const { error: transactionError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: credits,
        action: 'purchase',
        provider: 'stripe',
        notes: `Purchased ${packageName} package via Stripe (Session: ${session_id})`,
      });

    if (transactionError) {
      console.error('Error logging transaction:', transactionError);
    }

    console.log(`Successfully added ${credits} credits to user ${userId}. New balance: ${newBalance}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        credits_added: credits, 
        new_balance: newBalance 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error verifying payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
