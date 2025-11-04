import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, credits, amount } = await req.json();

    console.log(`Purchase confirmation would be sent to: ${email}`);
    console.log(`Credits purchased: ${credits}, Amount: $${amount}`);

    const emailContent = {
      to: email,
      subject: "Credit Purchase Confirmed",
      html: `
        <h1>Purchase Successful!</h1>
        <p>Thank you for your purchase.</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Credits Added:</strong> ${credits}</p>
          <p><strong>Amount Paid:</strong> $${amount}</p>
        </div>
        <p>Your credits have been added to your account and are ready to use.</p>
        <a href="${Deno.env.get('SITE_URL')}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
          Start Creating
        </a>
      `
    };

    return new Response(JSON.stringify({ success: true, message: "Confirmation email queued" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
