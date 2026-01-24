import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Receipt, Settings, CalendarDays, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useToast } from "@/hooks/use-toast";
import { useUIStore } from "@/store/uiStore";
import { 
  useSubscription, 
  usePlanLimits, 
  useInvoices, 
  useCreateCheckoutSession,
  useCreatePortalSession,
  PlanLimit 
} from "@/hooks/useBilling";
import { useUsageMetrics } from "@/hooks/useUsageMetrics";
import { CurrentPlanUsage } from "@/components/billing/CurrentPlanUsage";
import { PlanCards } from "@/components/billing/PlanCards";
import { InvoiceHistoryTable } from "@/components/billing/InvoiceHistoryTable";
import { format } from "date-fns";

const BillingPage = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { currentWorkspaceId } = useUIStore();
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);

  // Data hooks
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription(currentWorkspaceId ?? undefined);
  const { data: plans, isLoading: plansLoading } = usePlanLimits();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices(currentWorkspaceId ?? undefined);
  
  const currentPlanId = subscription?.plan_id || "free";
  const { data: usage, isLoading: usageLoading } = useUsageMetrics(currentWorkspaceId ?? undefined, currentPlanId);

  // Mutations
  const checkoutMutation = useCreateCheckoutSession();
  const portalMutation = useCreatePortalSession();

  // Handle checkout success/cancel from URL params
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      toast({
        title: "Subscription activated!",
        description: "Your plan has been upgraded successfully.",
      });
    } else if (canceled === "true") {
      toast({
        title: "Checkout canceled",
        description: "Your subscription was not changed.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  const handleUpgrade = async (plan: PlanLimit) => {
    if (!currentWorkspaceId) {
      toast({
        title: "No workspace selected",
        description: "Please select a workspace first.",
        variant: "destructive",
      });
      return;
    }

    if (plan.plan_id === "enterprise") {
      toast({
        title: "Contact Sales",
        description: "Please contact our sales team for enterprise pricing.",
      });
      return;
    }

    // TODO: Replace with actual Stripe price ID from your Stripe dashboard
    const priceId = plan.plan_id === "pro" ? "price_pro_monthly" : "";
    
    if (!priceId) {
      toast({
        title: "Configuration needed",
        description: "Stripe price IDs need to be configured for this plan.",
        variant: "destructive",
      });
      return;
    }

    setUpgradingPlanId(plan.plan_id);
    try {
      await checkoutMutation.mutateAsync({
        workspaceId: currentWorkspaceId,
        priceId,
        planId: plan.plan_id,
      });
    } finally {
      setUpgradingPlanId(null);
    }
  };

  const handleManageBilling = async () => {
    if (!currentWorkspaceId) return;
    
    if (!subscription?.stripe_customer_id) {
      toast({
        title: "No active subscription",
        description: "You need an active subscription to manage billing.",
      });
      return;
    }

    portalMutation.mutate(currentWorkspaceId);
  };

  const currentPlan = plans?.find((p) => p.plan_id === currentPlanId);
  const isPaidPlan = currentPlanId !== "free";
  const isCanceling = subscription?.cancel_at_period_end;

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8 max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Billing</h1>
            <p className="text-muted-foreground">
              Manage your subscription and billing
            </p>
          </div>

          {/* Cancellation Warning */}
          {isCanceling && subscription?.current_period_end && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your subscription is set to cancel on{" "}
                {format(new Date(subscription.current_period_end), "MMMM d, yyyy")}.
                Click "Manage Billing" to reactivate.
              </AlertDescription>
            </Alert>
          )}

          {/* Current Plan Card */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>
                    You're currently on the {currentPlan?.plan_name || "Free"} plan
                  </CardDescription>
                </div>
                <Badge 
                  className={isPaidPlan 
                    ? "bg-accent/10 text-accent border-accent/30" 
                    : "bg-muted text-muted-foreground"
                  }
                >
                  {currentPlan?.plan_name || "Free"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CurrentPlanUsage usage={usage} isLoading={usageLoading} />
              
              {/* Subscription details for paid plans */}
              {isPaidPlan && subscription?.current_period_end && (
                <div className="mt-6 pt-6 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="w-4 h-4" />
                    <span>
                      {isCanceling ? "Access until" : "Renews"}{" "}
                      {format(new Date(subscription.current_period_end), "MMMM d, yyyy")}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManageBilling}
                    disabled={portalMutation.isPending}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Subscription
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Plans */}
          <h2 className="text-xl font-semibold text-foreground mb-4">Available Plans</h2>
          <div className="mb-8">
            <PlanCards
              plans={plans}
              currentPlanId={currentPlanId}
              isLoading={plansLoading}
              isUpgrading={!!upgradingPlanId}
              onUpgrade={handleUpgrade}
            />
          </div>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription>Your past invoices and receipts</CardDescription>
                </div>
                {isPaidPlan && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleManageBilling}
                    disabled={portalMutation.isPending}
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Manage Billing
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <InvoiceHistoryTable invoices={invoices} isLoading={invoicesLoading} />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

export default BillingPage;
