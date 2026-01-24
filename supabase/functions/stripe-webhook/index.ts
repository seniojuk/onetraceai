import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const body = await req.text();
    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        throw new Error("No stripe signature");
      }
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    console.log("Processing Stripe event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspace_id;
        const planId = session.metadata?.plan_id;

        if (workspaceId && session.subscription) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          // Upsert subscription record
          const { error } = await supabase
            .from("subscriptions")
            .upsert({
              workspace_id: workspaceId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              stripe_price_id: subscription.items.data[0]?.price.id,
              plan_id: planId || "pro",
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            }, { onConflict: "workspace_id" });

          if (error) console.error("Error upserting subscription:", error);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId = subscription.metadata?.workspace_id;

        if (workspaceId) {
          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: subscription.status,
              stripe_price_id: subscription.items.data[0]?.price.id,
              plan_id: subscription.metadata?.plan_id || "pro",
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              canceled_at: subscription.canceled_at 
                ? new Date(subscription.canceled_at * 1000).toISOString() 
                : null,
            })
            .eq("stripe_subscription_id", subscription.id);

          if (error) console.error("Error updating subscription:", error);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            canceled_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) console.error("Error canceling subscription:", error);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Get workspace from customer
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("workspace_id, id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (sub) {
          const { error } = await supabase.from("invoices").insert({
            workspace_id: sub.workspace_id,
            subscription_id: sub.id,
            stripe_invoice_id: invoice.id,
            stripe_payment_intent_id: invoice.payment_intent as string,
            amount_paid: invoice.amount_paid,
            amount_due: invoice.amount_due,
            currency: invoice.currency,
            status: "paid",
            invoice_pdf: invoice.invoice_pdf,
            hosted_invoice_url: invoice.hosted_invoice_url,
            period_start: new Date(invoice.period_start * 1000).toISOString(),
            period_end: new Date(invoice.period_end * 1000).toISOString(),
            paid_at: new Date().toISOString(),
          });

          if (error) console.error("Error creating invoice:", error);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("workspace_id, id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (sub) {
          await supabase.from("invoices").insert({
            workspace_id: sub.workspace_id,
            subscription_id: sub.id,
            stripe_invoice_id: invoice.id,
            amount_paid: 0,
            amount_due: invoice.amount_due,
            currency: invoice.currency,
            status: "failed",
            period_start: new Date(invoice.period_start * 1000).toISOString(),
            period_end: new Date(invoice.period_end * 1000).toISOString(),
          });
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
