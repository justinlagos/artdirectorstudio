import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendImageEmailRequest {
  imageUrl: string;
  prompt: string;
  action: "generate" | "edit" | "blend" | "upscale";
  viewUrl?: string;
  downloadUrl?: string;
}

const createEmailHtml = (payload: SendImageEmailRequest, userEmail: string) => {
  const safePrompt = payload.prompt?.trim() || "Your recent creation";
  const viewUrl = payload.viewUrl || "https://artdirector.studio";
  const downloadUrl = payload.downloadUrl || payload.imageUrl;

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif; background:#f6f9fc; margin:0; padding:24px; }
          .container { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08); }
          .header { padding: 28px 32px; background: linear-gradient(120deg, #4338ca, #6366f1); color: #fff; }
          .title { margin: 0; font-size: 22px; font-weight: 700; }
          .content { padding: 28px 32px; color: #111827; }
          .prompt { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin: 16px 0; font-size: 14px; line-height: 1.5; }
          .image { border-radius: 10px; overflow: hidden; border: 1px solid #e5e7eb; }
          .image img { width: 100%; display: block; }
          .actions { margin-top: 20px; display: flex; gap: 12px; flex-wrap: wrap; }
          .button { text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; }
          .button.primary { background: #4338ca; color: #fff; box-shadow: 0 10px 30px rgba(99, 102, 241, 0.25); }
          .button.secondary { background: #f3f4f6; color: #111827; border: 1px solid #e5e7eb; }
          .footer { padding: 0 32px 28px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <p class="title">Your latest ArtDirector Studio creation</p>
            <p style="margin: 6px 0 0; opacity: 0.9;">Delivered to ${userEmail}</p>
          </div>
          <div class="content">
            <p style="margin: 0 0 8px; font-weight: 600; text-transform: capitalize;">${payload.action} result</p>
            <div class="prompt">${safePrompt}</div>
            <div class="image">
              <img src="${payload.imageUrl}" alt="Generated image" />
            </div>
            <div class="actions">
              <a class="button primary" href="${viewUrl}" target="_blank" rel="noopener noreferrer">View in Studio</a>
              <a class="button secondary" href="${downloadUrl}" target="_blank" rel="noopener noreferrer">Download</a>
            </div>
          </div>
          <div class="footer">
            <p>You're receiving this because you requested an email delivery in ArtDirector Studio.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      console.error("[SEND-IMAGE-EMAIL] Unable to resolve user", userError);
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as SendImageEmailRequest;
    if (!body?.imageUrl || !body?.prompt || !body?.action) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendKey);
    const html = createEmailHtml(body, userData.user.email);

    await resend.emails.send({
      from: "ArtDirector Studio <studio@resend.dev>",
      to: [userData.user.email],
      subject: "Your latest ArtDirector Studio creation",
      html,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[SEND-IMAGE-EMAIL] Unexpected error", error);
    return new Response(JSON.stringify({ error: "Failed to send email" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
