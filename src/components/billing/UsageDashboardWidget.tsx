import { useNavigate } from "react-router-dom";
import { FileText, FolderOpen, Sparkles, HardDrive, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { Skeleton } from "@/components/ui/skeleton";

interface UsageItemProps {
  label: string;
  used: number;
  limit: number | null;
  icon: React.ElementType;
  isWarning: boolean;
  isAtLimit: boolean;
}

function UsageItem({ label, used, limit, icon: Icon, isWarning, isAtLimit }: UsageItemProps) {
  const isUnlimited = limit === null;
  const percentage = isUnlimited ? 0 : limit === 0 ? 100 : Math.min((used / limit) * 100, 100);
  
  const getProgressColor = () => {
    if (isAtLimit) return "[&>div]:bg-destructive";
    if (isWarning) return "[&>div]:bg-amber-500";
    return "[&>div]:bg-accent";
  };

  const getTextColor = () => {
    if (isAtLimit) return "text-destructive";
    if (isWarning) return "text-amber-500";
    return "text-foreground";
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className={`text-xs font-medium ${getTextColor()}`}>
            {used.toLocaleString()}{isUnlimited ? "" : ` / ${limit?.toLocaleString()}`}
            {isUnlimited && <span className="text-muted-foreground ml-1">∞</span>}
          </span>
        </div>
        {!isUnlimited && (
          <Progress 
            value={percentage} 
            className={`h-1.5 ${getProgressColor()}`}
          />
        )}
        {isUnlimited && (
          <div className="h-1.5 w-full rounded-full bg-muted" />
        )}
      </div>
    </div>
  );
}

export function UsageDashboardWidget() {
  const navigate = useNavigate();
  const { usage, isLoading, artifactWarning, projectWarning, aiRunWarning, storageWarning, artifactAtLimit, projectAtLimit, aiRunAtLimit, storageAtLimit } = useUsageLimits();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Overview</CardTitle>
          <CardDescription>Your current plan limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!usage) {
    return null;
  }

  const hasAnyWarning = artifactWarning || projectWarning || aiRunWarning || storageWarning;
  const hasAnyLimit = artifactAtLimit || projectAtLimit || aiRunAtLimit || storageAtLimit;

  return (
    <Card className={hasAnyLimit ? "border-destructive/50" : hasAnyWarning ? "border-amber-500/50" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Usage Overview</CardTitle>
          <CardDescription>Your current plan limits</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/settings?tab=billing")}>
          Manage
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <UsageItem
          label="Artifacts"
          used={usage.artifacts.used}
          limit={usage.artifacts.limit}
          icon={FileText}
          isWarning={artifactWarning}
          isAtLimit={artifactAtLimit}
        />
        <UsageItem
          label="Projects"
          used={usage.projects.used}
          limit={usage.projects.limit}
          icon={FolderOpen}
          isWarning={projectWarning}
          isAtLimit={projectAtLimit}
        />
        <UsageItem
          label="AI Runs (this month)"
          used={usage.aiRuns.used}
          limit={usage.aiRuns.limit}
          icon={Sparkles}
          isWarning={aiRunWarning}
          isAtLimit={aiRunAtLimit}
        />
        <UsageItem
          label="Storage (MB)"
          used={usage.storage.used}
          limit={usage.storage.limit}
          icon={HardDrive}
          isWarning={storageWarning}
          isAtLimit={storageAtLimit}
        />
        
        {(hasAnyWarning || hasAnyLimit) && (
          <div className={`p-3 rounded-lg text-sm ${hasAnyLimit ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
            {hasAnyLimit 
              ? "You've reached one or more limits. Upgrade to continue." 
              : "You're approaching your usage limits."}
            <Button 
              variant="link" 
              size="sm" 
              className={`p-0 h-auto ml-1 ${hasAnyLimit ? "text-destructive" : "text-amber-700 dark:text-amber-400"}`}
              onClick={() => navigate("/settings?tab=billing")}
            >
              Upgrade now →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
