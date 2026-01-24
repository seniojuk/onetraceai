import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-BILLING-EMAIL] ${step}${detailsStr}`);
};

type EmailType = 
  | "subscription_created"
  | "subscription_upgraded"
  | "subscription_downgraded"
  | "subscription_cancelled"
  | "subscription_renewed"
  | "payment_failed"
  | "payment_succeeded"
  | "renewal_reminder";

interface BillingEmailRequest {
  type: EmailType;
  email: string;
  userName?: string;
  planName?: string;
  previousPlan?: string;
  amount?: number;
  currency?: string;
  renewalDate?: string;
  invoiceUrl?: string;
}

const getEmailContent = (request: BillingEmailRequest): { subject: string; html: string } => {
  const { type, userName, planName, previousPlan, amount, currency, renewalDate, invoiceUrl } = request;
  const name = userName || "there";
  const formattedAmount = amount ? `${currency?.toUpperCase() || 'USD'} ${(amount / 100).toFixed(2)}` : "";

  switch (type) {
    case "subscription_created":
      return {
        subject: `Welcome to ${planName || "Pro"}! 🎉`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Welcome to OneTrace AI, ${name}!</h1>
            <p>Thank you for subscribing to the <strong>${planName || "Pro"}</strong> plan.</p>
            <p>You now have access to:</p>
            <ul>
              <li>Unlimited artifacts</li>
              <li>Unlimited projects</li>
              <li>500 AI runs per month</li>
              <li>Priority support</li>
            </ul>
            <p>Start creating amazing things today!</p>
            <a href="https://onetraceai.lovable.app/dashboard" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Go to Dashboard</a>
          </div>
        `,
      };

    case "subscription_upgraded":
      return {
        subject: `Upgrade Successful! Welcome to ${planName || "Pro"} 🚀`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Upgrade Successful!</h1>
            <p>Hi ${name},</p>
            <p>Congratulations! You've successfully upgraded from <strong>${previousPlan || "Free"}</strong> to <strong>${planName || "Pro"}</strong>.</p>
            <p>Your new features are now active and ready to use.</p>
            <a href="https://onetraceai.lovable.app/billing" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Your Plan</a>
          </div>
        `,
      };

    case "subscription_downgraded":
      return {
        subject: `Plan Changed to ${planName || "Free"}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Plan Changed</h1>
            <p>Hi ${name},</p>
            <p>Your plan has been changed from <strong>${previousPlan || "Pro"}</strong> to <strong>${planName || "Free"}</strong>.</p>
            <p>This change will take effect at the end of your current billing period.</p>
            <p>If you change your mind, you can upgrade again anytime.</p>
            <a href="https://onetraceai.lovable.app/billing" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Manage Subscription</a>
          </div>
        `,
      };

    case "subscription_cancelled":
      return {
        subject: "We're sorry to see you go 😢",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Subscription Cancelled</h1>
            <p>Hi ${name},</p>
            <p>Your subscription has been cancelled. You'll continue to have access to your current plan until the end of your billing period.</p>
            <p>We'd love to have you back! If you change your mind, you can resubscribe anytime.</p>
            <a href="https://onetraceai.lovable.app/billing" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Resubscribe</a>
          </div>
        `,
      };

    case "payment_succeeded":
      return {
        subject: `Payment Received - ${formattedAmount}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Payment Successful ✓</h1>
            <p>Hi ${name},</p>
            <p>We've successfully processed your payment of <strong>${formattedAmount}</strong>.</p>
            ${invoiceUrl ? `<p><a href="${invoiceUrl}">View Invoice</a></p>` : ""}
            <p>Thank you for your continued support!</p>
          </div>
        `,
      };

    case "payment_failed":
      return {
        subject: "⚠️ Payment Failed - Action Required",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">Payment Failed</h1>
            <p>Hi ${name},</p>
            <p>We were unable to process your payment of <strong>${formattedAmount}</strong>.</p>
            <p>Please update your payment method to avoid any interruption to your service.</p>
            <a href="https://onetraceai.lovable.app/billing" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Update Payment Method</a>
          </div>
        `,
      };

    case "renewal_reminder":
      return {
        subject: `Your subscription renews on ${renewalDate}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Renewal Reminder</h1>
            <p>Hi ${name},</p>
            <p>Just a friendly reminder that your <strong>${planName || "Pro"}</strong> subscription will renew on <strong>${renewalDate}</strong>.</p>
            <p>Your card will be charged <strong>${formattedAmount}</strong>.</p>
            <p>No action is needed if you'd like to continue your subscription.</p>
            <a href="https://onetraceai.lovable.app/billing" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Manage Subscription</a>
          </div>
        `,
      };

    case "subscription_renewed":
      return {
        subject: `Subscription Renewed - ${planName || "Pro"}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Subscription Renewed ✓</h1>
            <p>Hi ${name},</p>
            <p>Your <strong>${planName || "Pro"}</strong> subscription has been successfully renewed.</p>
            <p>Amount charged: <strong>${formattedAmount}</strong></p>
            ${invoiceUrl ? `<p><a href="${invoiceUrl}">View Invoice</a></p>` : ""}
            <p>Thank you for being a valued subscriber!</p>
          </div>
        `,
      };

    default:
      return {
        subject: "OneTrace AI Billing Update",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Billing Update</h1>
            <p>Hi ${name},</p>
            <p>There's been an update to your billing. Please check your account for details.</p>
            <a href="https://onetraceai.lovable.app/billing" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Billing</a>
          </div>
        `,
      };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      logStep("RESEND_API_KEY not set, skipping email");
      return new Response(JSON.stringify({ success: false, reason: "RESEND_API_KEY not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const resend = new Resend(resendKey);
    const request: BillingEmailRequest = await req.json();
    logStep("Request parsed", { type: request.type, email: request.email });

    const { subject, html } = getEmailContent(request);
    logStep("Email content generated", { subject });

    const emailResponse = await resend.emails.send({
      from: "OneTrace AI <noreply@onetraceai.com>",
      to: [request.email],
      subject,
      html,
    });

    const responseData = emailResponse.data;
    logStep("Email sent successfully", { id: responseData?.id });

    return new Response(JSON.stringify({ success: true, emailId: responseData?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in send-billing-email", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
