import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract and decode JWT to get user ID
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error("Invalid JWT format");
      return new Response(
        JSON.stringify({ error: "Invalid token format" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode the payload (second part of JWT)
    const payload = JSON.parse(atob(parts[1]));
    const userId = payload.sub;
    
    if (!userId) {
      console.error("No user ID in JWT");
      return new Response(
        JSON.stringify({ error: "Invalid token: no user ID" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Authenticated user:", userId);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: authHeader } 
        }
      }
    );

    const { action, provider } = await req.json();
    
    if (!action || !provider) {
      return new Response(
        JSON.stringify({ error: "Missing action or provider" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get pricing config
    const { data: pricingData, error: pricingError } = await supabaseClient
      .from('pricing_config')
      .select('credits')
      .eq('action', action)
      .eq('provider', provider)
      .eq('active', true)
      .single();

    if (pricingError || !pricingData) {
      console.error("Pricing config error:", pricingError);
      return new Response(
        JSON.stringify({ error: "Pricing configuration not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const creditsRequired = pricingData.credits;

    // Get current balance
    const { data: creditsData, error: creditsError } = await supabaseClient
      .from('credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (creditsError || !creditsData) {
      console.error("Credits fetch error:", creditsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch credits" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (creditsData.balance < creditsRequired) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient credits",
          required: creditsRequired,
          balance: creditsData.balance
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role key for operations that bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Deduct credits
    const { error: updateError } = await supabaseAdmin
      .from('credits')
      .update({ balance: creditsData.balance - creditsRequired })
      .eq('user_id', userId);

    if (updateError) {
      console.error("Credits deduction error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to deduct credits" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log transaction
    const { error: transactionError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: -creditsRequired,
        action: action,
        provider: provider,
        notes: `Deducted ${creditsRequired} credits for ${action} using ${provider}`
      });

    if (transactionError) {
      console.error("Transaction logging error:", transactionError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        remaining_balance: creditsData.balance - creditsRequired,
        deducted: creditsRequired
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in deduct-credits function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
