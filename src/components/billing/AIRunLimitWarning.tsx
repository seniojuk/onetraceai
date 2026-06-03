import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { daysUntil, nextMonthReset } from "./usageCopy";

interface AIRunLimitWarningProps {
  className?: string;
}

/**
 * Inline, single-line nudge above AI-generation forms.
 * Quiet at warn, firm at limit, never modal.
 */
export function AIRunLimitWarning({ className = "" }: AIRunLimitWarningProps) {
  const navigate = useNavigate();
  const { aiRunWarning, aiRunAtLimit, usage, isLoading } = useUsageLimits();

  if (isLoading || (!aiRunWarning && !aiRunAtLimit)) return null;

  const used = usage?.aiRuns.used ?? 0;
  const limit = usage?.aiRuns.limit ?? 0;
  const remaining = Math.max(0, limit - used);
  const resetIn = daysUntil(nextMonthReset());

  const headline = aiRunAtLimit ? "Monthly AI runs used up" : "Running low on AI runs";
  const detail = aiRunAtLimit
    ? `Resets in ${resetIn}d.`
    : `${remaining} left · resets in ${resetIn}d.`;

  return (
    <div
      role="status"
      className={[
        "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
        aiRunAtLimit
          ? "border-warning/40 bg-warning/10"
          : "border-hairline bg-muted/40",
        className,
      ].join(" ")}
    >
      <Sparkles
        className={[
          "h-4 w-4 shrink-0",
          aiRunAtLimit ? "text-warning" : "text-muted-foreground",
        ].join(" ")}
        aria-hidden
      />
      <div className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
        <span className="font-medium">{headline}</span>
        <span className="text-muted-foreground tabular-nums">{used}/{limit}</span>
        <span className="text-muted-foreground">{detail}</span>
      </div>
      <Button
        variant={aiRunAtLimit ? "default" : "outline"}
        size="sm"
        className="h-7 px-2.5 text-xs"
        onClick={() => navigate("/settings?tab=billing")}
      >
        Upgrade
      </Button>
    </div>
  );
}

export function useAIRunLimit() {
  const { canRunAI, aiRunAtLimit, usage } = useUsageLimits();
  return {
    canRunAI,
    isAtLimit: aiRunAtLimit,
    used: usage?.aiRuns.used ?? 0,
    limit: usage?.aiRuns.limit,
    remaining:
      usage?.aiRuns.limit !== null
        ? Math.max(0, (usage?.aiRuns.limit ?? 0) - (usage?.aiRuns.used ?? 0))
        : null,
  };
}
