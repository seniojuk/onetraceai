import { useNavigate } from "react-router-dom";
import { AlertTriangle, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useUsageLimits } from "@/hooks/useUsageLimits";

interface AIRunLimitWarningProps {
  className?: string;
}

export function AIRunLimitWarning({ className }: AIRunLimitWarningProps) {
  const navigate = useNavigate();
  const { canRunAI, aiRunWarning, aiRunAtLimit, usage, isLoading } = useUsageLimits();

  if (isLoading || (!aiRunWarning && !aiRunAtLimit)) {
    return null;
  }

  const used = usage?.aiRuns.used ?? 0;
  const limit = usage?.aiRuns.limit ?? 0;
  const remaining = limit !== null ? Math.max(0, limit - used) : null;

  if (aiRunAtLimit) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>AI Run Limit Reached</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <span>
            You've used all {limit} AI runs for this month. Upgrade your plan to continue generating content.
          </span>
          <Button
            variant="outline"
            size="sm"
            className="w-fit border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => navigate("/settings?tab=billing")}
          >
            Upgrade Plan
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (aiRunWarning) {
    return (
      <Alert className={`border-amber-500/50 bg-amber-500/10 ${className}`}>
        <Sparkles className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-700 dark:text-amber-400">Approaching AI Run Limit</AlertTitle>
        <AlertDescription className="text-amber-700/80 dark:text-amber-400/80">
          You have {remaining} AI run{remaining !== 1 ? "s" : ""} remaining this month ({used}/{limit} used).{" "}
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto text-amber-700 dark:text-amber-400 underline"
            onClick={() => navigate("/settings?tab=billing")}
          >
            Upgrade for more
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

export function useAIRunLimit() {
  const { canRunAI, aiRunAtLimit, usage } = useUsageLimits();
  
  return {
    canRunAI,
    isAtLimit: aiRunAtLimit,
    used: usage?.aiRuns.used ?? 0,
    limit: usage?.aiRuns.limit,
    remaining: usage?.aiRuns.limit !== null 
      ? Math.max(0, (usage?.aiRuns.limit ?? 0) - (usage?.aiRuns.used ?? 0)) 
      : null,
  };
}
