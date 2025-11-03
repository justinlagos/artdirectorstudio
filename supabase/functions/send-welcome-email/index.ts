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
    const { email, username } = await req.json();

    // In a real implementation, you would integrate with Resend or another email service
    // For now, we'll log and return success
    console.log(`Welcome email would be sent to: ${email}`);
    console.log(`Username: ${username || 'New User'}`);

    // Example email content structure
    const emailContent = {
      to: email,
      subject: "Welcome to ArtDirector Studio!",
      html: `
        <h1>Welcome to ArtDirector Studio, ${username || 'Creative'}!</h1>
        <p>Thank you for joining us. You've been credited with 50 free credits to get started.</p>
        <p>Start creating amazing AI-powered art today!</p>
        <a href="${Deno.env.get('SITE_URL')}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
          Start Creating
        </a>
      `
    };

    return new Response(JSON.stringify({ success: true, message: "Welcome email queued" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
