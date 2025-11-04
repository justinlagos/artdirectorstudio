import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WaitlistRequest {
  email: string;
  name?: string;
  consent: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, consent }: WaitlistRequest = await req.json();

    // Validate input
    if (!email || !consent) {
      return new Response(
        JSON.stringify({ error: "Email and consent required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if email already exists
    const { data: existing } = await supabase
      .from("beta_waitlist")
      .select("id, status")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          message: "You're already on the waitlist!",
          status: existing.status,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Insert into waitlist
    const { data: waitlistEntry, error: insertError } = await supabase
      .from("beta_waitlist")
      .insert({
        email,
        name,
        consent,
        status: "pending",
        source: "landing_page",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to join waitlist");
    }

    // Send confirmation email
    try {
      const emailResponse = await resend.emails.send({
        from: "TryArtie <onboarding@resend.dev>",
        to: [email],
        subject: "You're on the TryArtie Beta List! 🎉",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Welcome to TryArtie Beta</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 32px;">✨ Welcome to TryArtie</h1>
              </div>
              
              <div style="background: #f9fafb; padding: 40px 20px; border-radius: 0 0 12px 12px;">
                <p style="font-size: 18px; margin-top: 0;">Hey ${name || "there"}! 👋</p>
                
                <p style="font-size: 16px; line-height: 1.8;">
                  You're officially on the <strong>TryArtie beta waitlist</strong>. We're pumped to have you!
                </p>
                
                <div style="background: white; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #667eea;">
                  <h2 style="margin-top: 0; font-size: 20px; color: #667eea;">What's Next?</h2>
                  <ul style="padding-left: 20px;">
                    <li style="margin-bottom: 12px;">We're rolling out invites in waves</li>
                    <li style="margin-bottom: 12px;">You'll get an email with your beta access link</li>
                    <li style="margin-bottom: 12px;">Meanwhile, check out our <a href="${supabaseUrl.replace("supabase.co", "lovableproject.com")}/inspire" style="color: #667eea; text-decoration: none;">Inspire Gallery</a></li>
                  </ul>
                </div>
                
                <p style="font-size: 16px;">
                  Want to move up the list? Share TryArtie with your creative friends!
                </p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${supabaseUrl.replace("supabase.co", "lovableproject.com")}/inspire" 
                     style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Explore the Gallery
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #666; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                  Questions? Just reply to this email.<br>
                  - The TryArtie Team
                </p>
              </div>
            </body>
          </html>
        `,
      });

      console.log("Confirmation email sent:", emailResponse);
    } catch (emailError: any) {
      console.error("Email error:", emailError);
      // Don't fail the request if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Successfully joined waitlist!",
        id: waitlistEntry.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in waitlist-signup:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
