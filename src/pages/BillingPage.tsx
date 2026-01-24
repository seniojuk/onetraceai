import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Receipt, Settings, CalendarDays, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useToast } from "@/hooks/use-toast";
import { useUIStore } from "@/store/uiStore";
import { 
  useCheckSubscription,
  usePlanLimits, 
  useInvoices, 
  useCreateCheckout,
  useCustomerPortal,
  PlanLimit 
} from "@/hooks/useBilling";
import { useUsageMetrics } from "@/hooks/useUsageMetrics";
import { CurrentPlanUsage } from "@/components/billing/CurrentPlanUsage";
import { PlanCards } from "@/components/billing/PlanCards";
import { InvoiceHistoryTable } from "@/components/billing/InvoiceHistoryTable";
import { UpgradeConfirmDialog } from "@/components/billing/UpgradeConfirmDialog";
import { DowngradeConfirmDialog } from "@/components/billing/DowngradeConfirmDialog";
import { CancelSubscriptionDialog } from "@/components/billing/CancelSubscriptionDialog";
import { ContactSalesDialog } from "@/components/billing/ContactSalesDialog";
import { format } from "date-fns";

const BillingPage = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentWorkspaceId } = useUIStore();
  
  // Dialog states
  const [selectedPlan, setSelectedPlan] = useState<PlanLimit | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showContactSalesDialog, setShowContactSalesDialog] = useState(false);

  // Data hooks
  const { data: subscriptionStatus, isLoading: statusLoading, refetch: refetchStatus } = useCheckSubscription();
  const { data: plans, isLoading: plansLoading } = usePlanLimits();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices(currentWorkspaceId ?? undefined);
  
  const currentPlanId = subscriptionStatus?.plan_id || "free";
  const { data: usage, isLoading: usageLoading } = useUsageMetrics(currentWorkspaceId ?? undefined, currentPlanId);

  // Mutations
  const checkoutMutation = useCreateCheckout();
  const portalMutation = useCustomerPortal();

  // Handle checkout success/cancel from URL params
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      toast({
        title: "Subscription activated!",
        description: "Your plan has been upgraded successfully.",
      });
      refetchStatus();
      // Clear URL params
      setSearchParams({});
    } else if (canceled === "true") {
      toast({
        title: "Checkout canceled",
        description: "Your subscription was not changed.",
        variant: "destructive",
      });
      setSearchParams({});
    }
  }, [searchParams, toast, refetchStatus, setSearchParams]);

  const handlePlanAction = (plan: PlanLimit, action: "upgrade" | "downgrade" | "contact") => {
    if (action === "contact") {
      setShowContactSalesDialog(true);
      return;
    }

    if (plan.plan_id === currentPlanId) {
      return;
    }

    setSelectedPlan(plan);
    
    if (action === "downgrade") {
      setShowDowngradeDialog(true);
    } else {
      setShowUpgradeDialog(true);
    }
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan || !currentWorkspaceId) return;

    try {
      await checkoutMutation.mutateAsync({
        planId: selectedPlan.plan_id,
        workspaceId: currentWorkspaceId,
      });
      setShowUpgradeDialog(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleConfirmDowngrade = async () => {
    // For downgrade to free, redirect to customer portal for cancellation
    if (selectedPlan?.plan_id === "free") {
      portalMutation.mutate(`${window.location.origin}/billing`);
      setShowDowngradeDialog(false);
    }
  };

  const handleCancelSubscription = async () => {
    portalMutation.mutate(`${window.location.origin}/billing`);
    setShowCancelDialog(false);
  };

  const handleManageBilling = async () => {
    if (!subscriptionStatus?.subscribed) {
      toast({
        title: "No active subscription",
        description: "You need an active subscription to manage billing.",
      });
      return;
    }

    portalMutation.mutate(`${window.location.origin}/billing`);
  };

  const currentPlan = plans?.find((p) => p.plan_id === currentPlanId);
  const isPaidPlan = currentPlanId !== "free";
  const subscriptionEnd = subscriptionStatus?.subscription_end;

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Billing</h1>
              <p className="text-muted-foreground">
                Manage your subscription and billing
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStatus()}
              disabled={statusLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${statusLoading ? "animate-spin" : ""}`} />
              Refresh Status
            </Button>
          </div>

          {/* Subscription Status Alert */}
          {subscriptionEnd && isPaidPlan && (
            <Alert className="mb-6 border-accent/30 bg-accent/5">
              <CalendarDays className="h-4 w-4 text-accent" />
              <AlertDescription className="text-foreground">
                Your {currentPlan?.plan_name} subscription {
                  subscriptionStatus?.subscribed 
                    ? `renews on ${format(new Date(subscriptionEnd), "MMMM d, yyyy")}`
                    : `ended on ${format(new Date(subscriptionEnd), "MMMM d, yyyy")}`
                }
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
              
              {/* Subscription management for paid plans */}
              {isPaidPlan && (
                <div className="mt-6 pt-6 border-t flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCancelDialog(true)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Cancel Subscription
                  </Button>
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
              isUpgrading={checkoutMutation.isPending || portalMutation.isPending}
              onPlanAction={handlePlanAction}
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
                    View All Invoices
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <InvoiceHistoryTable invoices={invoices} isLoading={invoicesLoading} />
            </CardContent>
          </Card>
        </div>

        {/* Upgrade Confirmation Dialog */}
        <UpgradeConfirmDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          plan={selectedPlan}
          currentPlanId={currentPlanId}
          onConfirm={handleConfirmUpgrade}
          isLoading={checkoutMutation.isPending}
        />

        {/* Downgrade Confirmation Dialog */}
        <DowngradeConfirmDialog
          open={showDowngradeDialog}
          onOpenChange={setShowDowngradeDialog}
          targetPlan={selectedPlan}
          currentPlan={currentPlan || null}
          subscriptionEnd={subscriptionEnd || null}
          onConfirm={handleConfirmDowngrade}
          isLoading={portalMutation.isPending}
        />

        {/* Cancel Subscription Dialog */}
        <CancelSubscriptionDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          planName={currentPlan?.plan_name || "Pro"}
          subscriptionEnd={subscriptionEnd || null}
          onConfirm={handleCancelSubscription}
          isLoading={portalMutation.isPending}
        />

        {/* Contact Sales Dialog */}
        <ContactSalesDialog
          open={showContactSalesDialog}
          onOpenChange={setShowContactSalesDialog}
        />
      </AppLayout>
    </AuthGuard>
  );
};

export default BillingPage;
