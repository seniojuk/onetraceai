import { useNavigate } from "react-router-dom";
import { FileText, FolderOpen, Sparkles, HardDrive, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { Skeleton } from "@/components/ui/skeleton";
import { daysUntil, nextMonthReset } from "./usageCopy";

interface UsageItemProps {
  label: string;
  used: number;
  limit: number | null;
  icon: React.ElementType;
  isWarning: boolean;
  isAtLimit: boolean;
  hint?: string;
}

function UsageItem({ label, used, limit, icon: Icon, isWarning, isAtLimit, hint }: UsageItemProps) {
  const isUnlimited = limit === null;
  const percentage = isUnlimited ? 0 : limit === 0 ? 100 : Math.min((used / limit) * 100, 100);

  const barTone = isAtLimit
    ? "[&>div]:bg-warning"
    : isWarning
    ? "[&>div]:bg-warning/70"
    : "[&>div]:bg-foreground/70";

  const numTone = isAtLimit || isWarning ? "text-warning" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1 gap-2">
          <span className="text-sm font-medium text-foreground truncate">{label}</span>
          <span className={`text-xs tabular-nums ${numTone}`}>
            {used.toLocaleString()}
            {isUnlimited ? (
              <span className="text-muted-foreground ml-1">/ ∞</span>
            ) : (
              <span className="text-muted-foreground">{` / ${limit?.toLocaleString()}`}</span>
            )}
          </span>
        </div>
        {!isUnlimited ? (
          <Progress value={percentage} className={`h-1.5 ${barTone}`} />
        ) : (
          <div className="h-1.5 w-full rounded-full bg-muted" />
        )}
        {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

export function UsageDashboardWidget() {
  const navigate = useNavigate();
  const {
    usage, isLoading,
    artifactWarning, projectWarning, aiRunWarning, storageWarning,
    artifactAtLimit, projectAtLimit, aiRunAtLimit, storageAtLimit,
  } = useUsageLimits();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage</CardTitle>
          <CardDescription>This workspace</CardDescription>
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

  if (!usage) return null;

  const anyLimit = artifactAtLimit || projectAtLimit || aiRunAtLimit || storageAtLimit;
  const anyWarn = artifactWarning || projectWarning || aiRunWarning || storageWarning;
  const resetIn = daysUntil(nextMonthReset());

  return (
    <Card className={anyLimit || anyWarn ? "border-warning/40" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Usage</CardTitle>
          <CardDescription>This workspace</CardDescription>
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
          label="AI runs"
          used={usage.aiRuns.used}
          limit={usage.aiRuns.limit}
          icon={Sparkles}
          isWarning={aiRunWarning}
          isAtLimit={aiRunAtLimit}
          hint={`Resets in ${resetIn}d`}
        />
        <UsageItem
          label="Storage (MB)"
          used={usage.storage.used}
          limit={usage.storage.limit}
          icon={HardDrive}
          isWarning={storageWarning}
          isAtLimit={storageAtLimit}
        />
      </CardContent>
    </Card>
  );
}
