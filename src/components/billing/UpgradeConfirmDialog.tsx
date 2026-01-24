import { useState } from "react";
import { Loader2, CreditCard, Check, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { PlanLimit } from "@/hooks/useBilling";

interface UpgradeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanLimit | null;
  currentPlanId: string;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

export function UpgradeConfirmDialog({
  open,
  onOpenChange,
  plan,
  currentPlanId,
  onConfirm,
  isLoading,
}: UpgradeConfirmDialogProps) {
  if (!plan) return null;

  const isUpgrade = getPlanPriority(plan.plan_id) > getPlanPriority(currentPlanId);
  const isDowngrade = getPlanPriority(plan.plan_id) < getPlanPriority(currentPlanId);

  const formatPrice = (cents: number) => {
    if (cents === -1) return "Custom pricing";
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(0)}/month`;
  };

  const features = [
    plan.max_workspaces === null ? "Unlimited workspaces" : `${plan.max_workspaces} workspace`,
    plan.max_projects === null ? "Unlimited projects" : `${plan.max_projects} projects`,
    plan.max_artifacts === null ? "Unlimited artifacts" : `${plan.max_artifacts} artifacts`,
    plan.max_ai_runs_per_month === null ? "Unlimited AI runs" : `${plan.max_ai_runs_per_month} AI runs/month`,
  ];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {isUpgrade ? "Upgrade to" : isDowngrade ? "Downgrade to" : "Switch to"} {plan.plan_name}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You're about to {isUpgrade ? "upgrade" : isDowngrade ? "downgrade" : "switch"} your
                subscription to the <strong>{plan.plan_name}</strong> plan.
              </p>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">New Plan</span>
                  <Badge variant="secondary">{plan.plan_name}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Price</span>
                  <span className="text-lg font-bold text-foreground">
                    {formatPrice(plan.price_monthly)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">What you'll get:</p>
                <ul className="space-y-1">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {isDowngrade && (
                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                  <p className="text-sm text-warning">
                    Downgrading may limit your access to some features. Your data will be preserved.
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                You'll be redirected to Stripe to complete the payment securely.
                You can cancel anytime from the billing portal.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-accent hover:bg-accent/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>Continue to Checkout</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function getPlanPriority(planId: string): number {
  switch (planId) {
    case "free":
      return 0;
    case "pro":
      return 1;
    case "enterprise":
      return 2;
    default:
      return 0;
  }
}
