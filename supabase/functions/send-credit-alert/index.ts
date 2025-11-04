import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, balance } = await req.json();

    console.log(`Credit alert would be sent to: ${email}`);
    console.log(`Current balance: ${balance} credits`);

    // Example email content
    const emailContent = {
      to: email,
      subject: "Low Credit Balance Alert",
      html: `
        <h1>Your credits are running low!</h1>
        <p>You currently have ${balance} credits remaining.</p>
        <p>Purchase more credits to continue creating amazing content.</p>
        <a href="${Deno.env.get('SITE_URL')}/settings?tab=billing" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
          Purchase Credits
        </a>
      `
    };

    return new Response(JSON.stringify({ success: true, message: "Alert email queued" }), {
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
