import { Loader2, AlertTriangle, ArrowDown, Check } from "lucide-react";
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

interface DowngradeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlan: PlanLimit | null;
  currentPlan: PlanLimit | null;
  subscriptionEnd: string | null;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

export function DowngradeConfirmDialog({
  open,
  onOpenChange,
  targetPlan,
  currentPlan,
  subscriptionEnd,
  onConfirm,
  isLoading,
}: DowngradeConfirmDialogProps) {
  if (!targetPlan || !currentPlan) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "the end of your billing period";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getLostFeatures = () => {
    const lostFeatures: string[] = [];
    
    // Compare limits
    if (currentPlan.max_workspaces === null && targetPlan.max_workspaces !== null) {
      lostFeatures.push(`Workspace limit: ${targetPlan.max_workspaces} (currently unlimited)`);
    }
    if (currentPlan.max_projects === null && targetPlan.max_projects !== null) {
      lostFeatures.push(`Project limit: ${targetPlan.max_projects} (currently unlimited)`);
    }
    if (currentPlan.max_ai_runs_per_month === null && targetPlan.max_ai_runs_per_month !== null) {
      lostFeatures.push(`AI runs: ${targetPlan.max_ai_runs_per_month}/month (currently unlimited)`);
    }
    if ((currentPlan.max_ai_runs_per_month ?? 0) > (targetPlan.max_ai_runs_per_month ?? 0)) {
      lostFeatures.push(`Reduced AI runs: ${targetPlan.max_ai_runs_per_month}/month`);
    }
    
    return lostFeatures;
  };

  const newFeatures = [
    targetPlan.max_workspaces === null ? "Unlimited workspaces" : `${targetPlan.max_workspaces} workspace`,
    targetPlan.max_projects === null ? "Unlimited projects" : `${targetPlan.max_projects} projects`,
    targetPlan.max_ai_runs_per_month === null ? "Unlimited AI runs" : `${targetPlan.max_ai_runs_per_month} AI runs/month`,
  ];

  const lostFeatures = getLostFeatures();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ArrowDown className="w-5 h-5 text-warning" />
            Downgrade to {targetPlan.plan_name}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You're about to downgrade from <strong>{currentPlan.plan_name}</strong> to{" "}
                <strong>{targetPlan.plan_name}</strong>.
              </p>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Plan</span>
                  <Badge variant="outline">{currentPlan.plan_name}</Badge>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowDown className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">New Plan</span>
                  <Badge variant="secondary">{targetPlan.plan_name}</Badge>
                </div>
              </div>

              {lostFeatures.length > 0 && (
                <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Feature changes:</p>
                    <ul className="text-sm text-muted-foreground space-y-0.5">
                      {lostFeatures.map((feature, i) => (
                        <li key={i}>• {feature}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">New plan includes:</p>
                <ul className="space-y-1">
                  {newFeatures.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-muted-foreground">
                Your Pro access continues until {formatDate(subscriptionEnd)}. 
                After that, you'll be on the Free plan. Your data will be preserved.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Keep Current Plan</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-warning hover:bg-warning/90 text-warning-foreground"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm Downgrade"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
