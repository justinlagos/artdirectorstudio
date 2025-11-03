import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  waitlistId: string;
  customMessage?: string;
}

function generateInviteCode(): string {
  return `ARTIE-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { waitlistId, customMessage }: InviteRequest = await req.json();

    if (!waitlistId) {
      return new Response(
        JSON.stringify({ error: "Waitlist ID required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get waitlist entry
    const { data: waitlistEntry, error: fetchError } = await supabase
      .from("beta_waitlist")
      .select("*")
      .eq("id", waitlistId)
      .single();

    if (fetchError || !waitlistEntry) {
      return new Response(
        JSON.stringify({ error: "Waitlist entry not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate invite code
    const inviteCode = generateInviteCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    // Create invite
    const { error: inviteError } = await supabase
      .from("beta_invites")
      .insert({
        email: waitlistEntry.email,
        code: inviteCode,
        waitlist_id: waitlistId,
        expires_at: expiresAt.toISOString(),
      });

    if (inviteError) {
      console.error("Invite creation error:", inviteError);
      throw new Error("Failed to create invite");
    }

    // Update waitlist status
    await supabase
      .from("beta_waitlist")
      .update({
        status: "invited",
        invite_sent_at: new Date().toISOString(),
      })
      .eq("id", waitlistId);

    // Send invite email
    const activationLink = `${supabaseUrl.replace("supabase.co", "lovableproject.com")}/auth?invite=${inviteCode}`;
    
    // Personalize salutation
    const firstName = waitlistEntry.name?.split(" ")[0] || "";
    const salutation = firstName ? `Hi ${firstName},` : "Hi there,";
    
    // Format custom message for email if provided
    const formattedMessage = customMessage
      ? customMessage.split('\n').map(line => `<p style="font-size: 16px; line-height: 1.8; margin: 12px 0;">${line}</p>`).join('')
      : `
        <p style="font-size: 16px; line-height: 1.8; margin: 12px 0;">
          You're invited to join <strong>ArtDirector Studio</strong>, a creative platform where designers upload any image, get a full art-director-level analysis, and instantly generate new variations with precision.
        </p>
        <p style="font-size: 16px; line-height: 1.8; margin: 12px 0;">
          As one of our early beta users, you'll get:
        </p>
        <ul style="font-size: 16px; line-height: 1.8; padding-left: 20px; margin: 12px 0;">
          <li style="margin-bottom: 8px;">Exclusive early access to all creative tools</li>
          <li style="margin-bottom: 8px;">Bonus starter credits</li>
          <li style="margin-bottom: 8px;">Priority feedback channel with the ArtDirector team</li>
        </ul>
        <p style="font-size: 16px; line-height: 1.8; margin: 12px 0;">
          Thanks for helping shape the future of creative intelligence.
        </p>
      `;

    const emailResponse = await resend.emails.send({
      from: "ArtDirector Studio <onboarding@resend.dev>",
      to: [waitlistEntry.email],
      subject: "Welcome to the ArtDirector Studio Beta",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ArtDirector Studio Beta Invite</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #222; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff;">
            <!-- Logo Section -->
            <div style="text-align: center; padding: 40px 20px 20px 20px;">
              <div style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px;">
                <span style="color: white; font-size: 24px; font-weight: bold; letter-spacing: -0.5px;">ArtDirector Studio</span>
              </div>
            </div>
            
            <!-- Main Content -->
            <div style="background: #ffffff; padding: 20px 40px;">
              <p style="font-size: 18px; margin-top: 0; color: #222;">${salutation}</p>
              
              ${formattedMessage}
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${activationLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px;">
                  Join the Beta
                </a>
              </div>
              
              <!-- Invite Code Section -->
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center; border: 1px solid #e5e7eb;">
                <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin: 0 0 12px 0;">Your Invite Code</p>
                <div style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #667eea; letter-spacing: 2px;">
                  ${inviteCode}
                </div>
              </div>
              
              <p style="font-size: 16px; line-height: 1.8; margin: 24px 0;">
                See you inside,<br>
                <strong>The ArtDirector Studio Team</strong>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #666; margin: 0;">
                You're receiving this because you signed up for early access to ArtDirector Studio.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Beta invite sent:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Beta invite sent successfully",
        inviteCode,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-beta-invite:", error);
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
