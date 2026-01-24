import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

const PLAN_NAMES: Record<string, string> = {
  "prod_TqpRp9M0STW5f3": "Pro",
};

// Helper to send billing email
const sendBillingEmail = async (payload: Record<string, unknown>) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-billing-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    logStep("Billing email sent", result);
    return result;
  } catch (error) {
    logStep("Failed to send billing email", { error: String(error) });
    return null;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    // For now, we'll process without signature verification
    // In production, you should verify the webhook signature
    const event = JSON.parse(body) as Stripe.Event;
    
    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_email || session.customer_details?.email;
        const metadata = session.metadata || {};
        
        if (customerEmail) {
          await sendBillingEmail({
            type: metadata.previous_plan === "Free" ? "subscription_created" : "subscription_upgraded",
            email: customerEmail,
            planName: PLAN_NAMES[metadata.plan_id] || "Pro",
            previousPlan: metadata.previous_plan || "Free",
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        
        if (customer && !customer.deleted && customer.email) {
          const productId = subscription.items.data[0]?.price.product as string;
          const planName = PLAN_NAMES[productId] || "Pro";
          
          if (subscription.cancel_at_period_end) {
            await sendBillingEmail({
              type: "subscription_cancelled",
              email: customer.email,
              planName,
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        
        if (customer && !customer.deleted && customer.email) {
          await sendBillingEmail({
            type: "subscription_cancelled",
            email: customer.email,
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        
        if (customer && !customer.deleted && customer.email) {
          // Check if this is a renewal (not initial payment)
          if (invoice.billing_reason === "subscription_cycle") {
            await sendBillingEmail({
              type: "subscription_renewed",
              email: customer.email,
              amount: invoice.amount_paid,
              currency: invoice.currency,
              invoiceUrl: invoice.hosted_invoice_url,
            });
          } else {
            await sendBillingEmail({
              type: "payment_succeeded",
              email: customer.email,
              amount: invoice.amount_paid,
              currency: invoice.currency,
              invoiceUrl: invoice.hosted_invoice_url,
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        
        if (customer && !customer.deleted && customer.email) {
          await sendBillingEmail({
            type: "payment_failed",
            email: customer.email,
            amount: invoice.amount_due,
            currency: invoice.currency,
          });
        }
        break;
      }

      case "invoice.upcoming": {
        const invoice = event.data.object as Stripe.Invoice;
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        
        if (customer && !customer.deleted && customer.email) {
          const renewalDate = invoice.period_end 
            ? new Date(invoice.period_end * 1000).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "soon";
          
          await sendBillingEmail({
            type: "renewal_reminder",
            email: customer.email,
            renewalDate,
            amount: invoice.amount_due,
            currency: invoice.currency,
          });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
