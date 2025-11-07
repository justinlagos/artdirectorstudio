import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendInvoiceRequest {
  paymentId: string;
}

const generateInvoiceHTML = (data: {
  invoiceId: string;
  customerEmail: string;
  date: string;
  description: string;
  credits: number;
  amount: string;
  status: string;
  paymentId?: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceId}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; margin: 0 auto;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 48px;">
              <h1 style="color: #3b82f6; font-size: 32px; font-weight: bold; margin: 0;">Invoice</h1>
            </td>
          </tr>
          
          <!-- Invoice Details -->
          <tr>
            <td style="padding: 0 48px 24px;">
              <p style="color: #666; font-size: 14px; line-height: 20px; margin: 4px 0;">
                <strong>Invoice #:</strong> ${data.invoiceId}
              </p>
              <p style="color: #666; font-size: 14px; line-height: 20px; margin: 4px 0;">
                <strong>Date:</strong> ${data.date}
              </p>
              <p style="color: #666; font-size: 14px; line-height: 20px; margin: 4px 0;">
                <strong>Status:</strong> ${data.status.toUpperCase()}
              </p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 48px;">
              <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 20px 0;">
            </td>
          </tr>
          
          <!-- Bill To -->
          <tr>
            <td style="padding: 24px 48px 12px;">
              <h2 style="color: #333; font-size: 20px; font-weight: bold; margin: 0;">Bill To</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 48px 24px;">
              <p style="color: #333; font-size: 16px; line-height: 24px; margin: 0;">${data.customerEmail}</p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 48px;">
              <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 20px 0;">
            </td>
          </tr>
          
          <!-- Transaction Details -->
          <tr>
            <td style="padding: 24px 48px 12px;">
              <h2 style="color: #333; font-size: 20px; font-weight: bold; margin: 0;">Transaction Details</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 48px;">
              <table width="100%" cellpadding="12" cellspacing="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f6f9fc;">
                    <th style="text-align: left; font-size: 14px; font-weight: bold; color: #333; border-bottom: 2px solid #e6ebf1; padding: 12px;">Description</th>
                    <th style="text-align: left; font-size: 14px; font-weight: bold; color: #333; border-bottom: 2px solid #e6ebf1; padding: 12px;">Credits</th>
                    <th style="text-align: left; font-size: 14px; font-weight: bold; color: #333; border-bottom: 2px solid #e6ebf1; padding: 12px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid #e6ebf1;">
                    <td style="padding: 12px; font-size: 14px; color: #666;">${data.description}</td>
                    <td style="padding: 12px; font-size: 14px; color: #666;">${data.credits}</td>
                    <td style="padding: 12px; font-size: 14px; color: #666;">${data.amount}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 24px 48px 0;">
              <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 20px 0;">
            </td>
          </tr>
          
          <!-- Total -->
          <tr>
            <td style="padding: 24px 48px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: right; padding-right: 20px;">
                    <p style="font-size: 18px; font-weight: bold; color: #333; margin: 0;">Total:</p>
                  </td>
                  <td style="text-align: right; width: 30%;">
                    <p style="font-size: 20px; font-weight: bold; color: #3b82f6; margin: 0;">${data.amount}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          ${data.paymentId ? `
          <!-- Payment ID -->
          <tr>
            <td style="padding: 0 48px 24px;">
              <p style="color: #8898aa; font-size: 12px; line-height: 16px; margin: 0;">Payment ID: ${data.paymentId}</p>
            </td>
          </tr>
          ` : ''}
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 48px;">
              <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 20px 0;">
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 48px;">
              <p style="color: #8898aa; font-size: 12px; line-height: 16px; margin: 8px 0;">Thank you for your business!</p>
              <p style="color: #8898aa; font-size: 12px; line-height: 16px; margin: 8px 0;">If you have any questions about this invoice, please contact our support team.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { paymentId }: SendInvoiceRequest = await req.json();

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: "Payment ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch payment details
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .eq("user_id", user.id)
      .single();

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format amount
    const formatAmount = (amountCents: number, currency: string) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(amountCents / 100);
    };

    // Format date
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    // Generate HTML email
    const html = generateInvoiceHTML({
      invoiceId: payment.id.substring(0, 8).toUpperCase(),
      customerEmail: user.email || "Customer",
      date: formatDate(payment.created_at),
      description: payment.package_name || "Credit Purchase",
      credits: payment.credits_purchased,
      amount: formatAmount(payment.amount_cents, payment.currency),
      status: payment.status,
      paymentId: payment.stripe_payment_intent,
    });

    // Send email using Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const emailResponse = await resend.emails.send({
      from: "Artie AI <onboarding@resend.dev>",
      to: [user.email!],
      subject: `Invoice #${payment.id.substring(0, 8).toUpperCase()} - Artie AI`,
      html,
    });

    console.log("Invoice email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Invoice sent successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending invoice email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
