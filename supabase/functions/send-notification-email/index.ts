import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "trial_credits_low" | "daily_limit_reached" | "daily_usage_80_percent" | "subscription_renewal" | "payment_failure";
  userId: string;
  data?: Record<string, any>;
}

const createEmailHTML = (type: string, userName: string | undefined, data: any, baseUrl: string) => {
  const commonStyles = `
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif; 
      background-color: #f6f9fc; 
      margin: 0; 
      padding: 0; 
    }
    .container { 
      background-color: #ffffff; 
      margin: 0 auto; 
      padding: 48px; 
      max-width: 600px; 
    }
    h1 { 
      color: #333; 
      font-size: 24px; 
      margin-bottom: 24px; 
    }
    p { 
      color: #333; 
      font-size: 16px; 
      line-height: 26px; 
      margin: 16px 0; 
    }
    .button { 
      background-color: #5469d4; 
      border-radius: 4px; 
      color: #fff !important; 
      display: inline-block; 
      font-size: 16px; 
      padding: 12px 32px; 
      text-decoration: none; 
      margin: 24px 0; 
    }
    .footer { 
      color: #8898aa; 
      font-size: 12px; 
      margin-top: 32px; 
    }
    .highlight { 
      background-color: #f0f7ff; 
      border: 2px solid #5469d4; 
      border-radius: 4px; 
      padding: 20px; 
      margin: 24px 0; 
      text-align: center; 
      font-weight: bold; 
      font-size: 18px;
    }
    .alert { 
      background-color: #fef0ef; 
      border: 2px solid #d93025; 
      border-radius: 4px; 
      padding: 20px; 
      margin: 24px 0; 
      text-align: center; 
      font-weight: bold; 
      color: #d93025; 
      font-size: 18px;
    }
    .features {
      color: #555;
      font-size: 14px;
      line-height: 24px;
      background-color: #f8f9fa;
      border-left: 4px solid #5469d4;
      padding: 16px;
      margin: 16px 0;
    }
  `;

  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  switch (type) {
    case "trial_credits_low":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${commonStyles}</style>
        </head>
        <body>
          <div class="container">
            <h1>⚠️ Trial Credits Running Low</h1>
            <p>${greeting}</p>
            <p>You have only <strong>${data.creditsRemaining} trial credits</strong> remaining in your ArtDirector Studio account.</p>
            <p>To continue enjoying unlimited access to all our features, consider upgrading to a paid plan.</p>
            <a href="${baseUrl}/subscriptions" class="button">Upgrade Now</a>
            <p>Our plans start at just $3/month and include:</p>
            <div class="features">
              ✓ 10 generations per day<br/>
              ✓ All AI-powered tools<br/>
              ✓ Priority support<br/>
              ✓ No credit limits
            </div>
            <p class="footer">Best regards,<br/>The ArtDirector Studio Team</p>
          </div>
        </body>
        </html>
      `;

    case "daily_usage_80_percent":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${commonStyles}</style>
        </head>
        <body>
          <div class="container">
            <h1>📊 You're at 80% of Your Daily Limit</h1>
            <p>${greeting}</p>
            <p>You've used <strong>${data.dailyUsage} out of ${data.dailyLimit} generations</strong> today (${data.usagePercentage}% of your daily limit).</p>
            <p>You have <strong>${data.dailyLimit - data.dailyUsage} generations remaining</strong> today. Your limit will reset at <strong>${data.resetTime}</strong>.</p>
            <p>Want unlimited generations? Upgrade to Pro or Enterprise for unlimited daily access!</p>
            <a href="${baseUrl}/subscriptions" class="button">Upgrade to Unlimited</a>
            <div class="features">
              <strong>Pro Plan Benefits:</strong><br/>
              ✓ Unlimited daily generations<br/>
              ✓ All AI-powered tools<br/>
              ✓ Priority support<br/>
              ✓ Advanced features
            </div>
            <p class="footer">Best regards,<br/>The ArtDirector Studio Team</p>
          </div>
        </body>
        </html>
      `;

    case "daily_limit_reached":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${commonStyles}</style>
        </head>
        <body>
          <div class="container">
            <h1>📊 Daily Limit Reached</h1>
            <p>${greeting}</p>
            <p>You've used all <strong>${data.dailyLimit} generations</strong> for today.</p>
            <p>Your limit will reset at <strong>${data.resetTime}</strong>.</p>
            <p>Want unlimited generations? Upgrade to Pro or Enterprise for unlimited daily access!</p>
            <a href="${baseUrl}/subscriptions" class="button">Upgrade to Unlimited</a>
            <div class="features">
              <strong>Pro Plan Benefits:</strong><br/>
              ✓ Unlimited daily generations<br/>
              ✓ All AI-powered tools<br/>
              ✓ Priority support<br/>
              ✓ Advanced features
            </div>
            <p class="footer">Best regards,<br/>The ArtDirector Studio Team</p>
          </div>
        </body>
        </html>
      `;

    case "subscription_renewal":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${commonStyles}</style>
        </head>
        <body>
          <div class="container">
            <h1>🔄 Subscription Renewal Reminder</h1>
            <p>${greeting}</p>
            <p>Your <strong>${data.planName}</strong> subscription will automatically renew on <strong>${data.renewalDate}</strong>.</p>
            <div class="highlight">Renewal Amount: ${data.amount}</div>
            <p>We'll charge your payment method on file. No action is needed unless you want to make changes.</p>
            <a href="${baseUrl}/settings" class="button">Manage Subscription</a>
            <p>If you have any questions or need to update your payment method, you can manage your subscription at any time.</p>
            <p class="footer">Thank you for being a valued member!<br/>The ArtDirector Studio Team</p>
          </div>
        </body>
        </html>
      `;

    case "payment_failure":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${commonStyles} .button { background-color: #d93025; }</style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: #d93025;">⚠️ Payment Failed</h1>
            <p>${greeting}</p>
            <p style="color: #d93025; font-weight: bold;">We couldn't process your payment for your <strong>${data.planName}</strong> subscription.</p>
            <div class="alert">Failed Amount: ${data.amount}</div>
            <p><strong>This could be due to:</strong></p>
            <p>
              • Insufficient funds<br/>
              • Expired card<br/>
              • Card declined by your bank<br/>
              • Incorrect billing information
            </p>
            <a href="${baseUrl}/settings" class="button">Update Payment Method</a>
            <p>We'll automatically retry the payment on <strong>${data.retryDate}</strong>. If the payment continues to fail, your subscription may be cancelled.</p>
            <p style="background-color: #fff8e1; border-left: 4px solid #ffa000; padding: 16px; margin: 24px 0;">
              <strong>Please update your payment information as soon as possible to avoid any interruption to your service.</strong>
            </p>
            <p class="footer">Need help? Contact our support team.<br/>The ArtDirector Studio Team</p>
          </div>
        </body>
        </html>
      `;

    default:
      return "";
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { type, userId, data }: NotificationRequest = await req.json();
    console.log(`[SEND-NOTIFICATION] Processing ${type} for user ${userId}`);

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email, username")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("[SEND-NOTIFICATION] User not found:", profileError);
      throw new Error("User not found");
    }

    const userName = profile.username || undefined;
    const userEmail = profile.email;
    const baseUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".app") || "https://artdirector.studio";

    const subjects = {
      trial_credits_low: "⚠️ Your trial credits are running low",
      daily_usage_80_percent: "📊 You're at 80% of your daily limit",
      daily_limit_reached: "📊 You've reached your daily generation limit",
      subscription_renewal: "🔄 Your subscription is renewing soon",
      payment_failure: "⚠️ Action required: Payment failed for your subscription",
    };

    const html = createEmailHTML(type, userName, data, baseUrl);
    const subject = subjects[type];

    console.log(`[SEND-NOTIFICATION] Sending ${type} email to ${userEmail}`);

    // Send email using Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ArtDirector Studio <onboarding@resend.dev>",
        to: [userEmail],
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error("[SEND-NOTIFICATION] Resend API error:", errorData);
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const emailData = await resendResponse.json();
    console.log(`[SEND-NOTIFICATION] Email sent successfully:`, emailData);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id || emailData }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[SEND-NOTIFICATION] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
