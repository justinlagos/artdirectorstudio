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

    const emailResponse = await resend.emails.send({
      from: "TryArtie <onboarding@resend.dev>",
      to: [waitlistEntry.email],
      subject: "Your TryArtie Beta Access is Here! 🚀",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>TryArtie Beta Invite</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 36px;">🎉 You're In!</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 40px 20px; border-radius: 0 0 12px 12px;">
              <p style="font-size: 18px; margin-top: 0;">Hey ${waitlistEntry.name || "there"}! 🔥</p>
              
              <p style="font-size: 16px; line-height: 1.8;">
                Your <strong>TryArtie beta access</strong> is ready! Time to level up your creative game.
              </p>
              
              ${customMessage ? `
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #667eea;">
                  <p style="margin: 0; font-style: italic; color: #666;">"${customMessage}"</p>
                </div>
              ` : ""}
              
              <div style="background: white; padding: 24px; border-radius: 8px; margin: 24px 0; text-align: center;">
                <p style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin: 0 0 12px 0;">Your Invite Code</p>
                <div style="background: #f9fafb; padding: 16px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; color: #667eea; letter-spacing: 2px; margin-bottom: 20px;">
                  ${inviteCode}
                </div>
                <a href="${activationLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; margin-top: 12px;">
                  Activate Your Account
                </a>
                <p style="font-size: 12px; color: #999; margin-top: 16px;">
                  This invite expires in 7 days
                </p>
              </div>
              
              <div style="background: white; padding: 24px; border-radius: 8px; margin: 24px 0;">
                <h2 style="margin-top: 0; font-size: 20px; color: #667eea;">Quick Start Guide</h2>
                <ol style="padding-left: 20px; margin-bottom: 0;">
                  <li style="margin-bottom: 12px;">Click the activation link above</li>
                  <li style="margin-bottom: 12px;">Set up your account</li>
                  <li style="margin-bottom: 12px;">Upload an image or browse Inspire</li>
                  <li style="margin-bottom: 12px;">Get art-director level breakdowns</li>
                  <li>Start creating!</li>
                </ol>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                Need help? Just reply to this email.<br>
                Welcome to the fam! 🚀<br>
                - The TryArtie Team
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
