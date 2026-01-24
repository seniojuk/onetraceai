import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Stripe price IDs for each plan
const PRICE_IDS: Record<string, string> = {
  pro: "price_1St7mPG45CY5mATXpSHF0gry",
};

const PLAN_NAMES: Record<string, string> = {
  pro: "Pro",
  free: "Free",
  enterprise: "Enterprise",
};

// Helper to send billing email
const sendBillingEmail = async (
  supabaseUrl: string,
  supabaseKey: string,
  payload: Record<string, unknown>
) => {
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
  } catch (error) {
    logStep("Failed to send billing email", { error: String(error) });
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { planId, workspaceId, successUrl, cancelUrl } = await req.json();
    logStep("Request body parsed", { planId, workspaceId });

    const priceId = PRICE_IDS[planId];
    if (!priceId) {
      throw new Error(`No price found for plan: ${planId}`);
    }
    logStep("Price ID resolved", { priceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    let previousPlan = "Free";
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
      
      // Check for existing subscription to determine previous plan
      const existingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });
      if (existingSubs.data.length > 0) {
        const existingProductId = existingSubs.data[0].items.data[0].price.product as string;
        if (existingProductId === "prod_TqpRp9M0STW5f3") {
          previousPlan = "Pro";
        }
      }
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl || `${origin}/billing?success=true`,
      cancel_url: cancelUrl || `${origin}/billing?canceled=true`,
      metadata: {
        workspace_id: workspaceId,
        plan_id: planId,
        user_id: user.id,
        user_email: user.email,
        previous_plan: previousPlan,
      },
      subscription_data: {
        metadata: {
          workspace_id: workspaceId,
          plan_id: planId,
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
