import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to send invoice email
async function sendInvoiceEmail(paymentId: string, email: string, supabaseAdmin: any) {
  try {
    // Fetch payment details
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment not found');
    }

    // Format amount
    const formatAmount = (amountCents: number, currency: string) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amountCents / 100);
    };

    // Format date
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    // Generate HTML email (simplified inline version)
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background-color: #f6f9fc; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px;">
          <h1 style="color: #3b82f6;">Invoice</h1>
          <p><strong>Invoice #:</strong> ${payment.id.substring(0, 8).toUpperCase()}</p>
          <p><strong>Date:</strong> ${formatDate(payment.created_at)}</p>
          <p><strong>Status:</strong> ${payment.status.toUpperCase()}</p>
          <hr style="border: 1px solid #e6ebf1; margin: 20px 0;">
          <h2>Bill To</h2>
          <p>${email}</p>
          <hr style="border: 1px solid #e6ebf1; margin: 20px 0;">
          <h2>Transaction Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #f6f9fc;">
              <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e6ebf1;">Description</th>
              <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e6ebf1;">Credits</th>
              <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e6ebf1;">Amount</th>
            </tr>
            <tr>
              <td style="padding: 12px;">${payment.package_name || 'Credit Purchase'}</td>
              <td style="padding: 12px;">${payment.credits_purchased}</td>
              <td style="padding: 12px;">${formatAmount(payment.amount_cents, payment.currency)}</td>
            </tr>
          </table>
          <hr style="border: 1px solid #e6ebf1; margin: 20px 0;">
          <div style="text-align: right;">
            <strong style="font-size: 18px;">Total: </strong>
            <strong style="font-size: 20px; color: #3b82f6;">${formatAmount(payment.amount_cents, payment.currency)}</strong>
          </div>
          ${payment.stripe_payment_intent ? `<p style="color: #8898aa; font-size: 12px;">Payment ID: ${payment.stripe_payment_intent}</p>` : ''}
          <hr style="border: 1px solid #e6ebf1; margin: 20px 0;">
          <p style="color: #8898aa; font-size: 12px;">Thank you for your business!</p>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    
    await resend.emails.send({
      from: 'Artie AI <onboarding@resend.dev>',
      to: [email],
      subject: `Invoice #${payment.id.substring(0, 8).toUpperCase()} - Artie AI`,
      html,
    });

    console.log('Invoice email sent successfully for payment:', paymentId);
  } catch (error) {
    console.error('Error in sendInvoiceEmail:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase URL or ANON key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey
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
      apiVersion: '2024-11-20.acacia',
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

    // Create payment record
    const { data: paymentRecord, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: userId,
        credits_purchased: credits,
        amount_cents: session.amount_total || 0,
        currency: session.currency || 'usd',
        status: 'completed',
        package_name: packageName,
        stripe_payment_intent: session.payment_intent as string,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
    } else {
      console.log('Payment record created:', paymentRecord.id);
      
      // Send invoice email in background (non-blocking)
      if (user.email) {
        sendInvoiceEmail(paymentRecord.id, user.email, supabaseAdmin).catch(error => {
          console.error('Error sending invoice email:', error);
        });
      }
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
