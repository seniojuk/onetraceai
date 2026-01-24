import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageMetrics } from "@/hooks/useUsageMetrics";
import { HardDrive, FileText, FolderOpen, Sparkles } from "lucide-react";

interface UsageMetricCardProps {
  label: string;
  used: number;
  limit: number | null;
  icon: React.ReactNode;
}

function UsageMetricCard({ label, used, limit, icon }: UsageMetricCardProps) {
  const percentage = limit ? Math.min((used / limit) * 100, 100) : 0;
  const isUnlimited = limit === null;
  const isNearLimit = limit && percentage >= 80;
  const isAtLimit = limit && percentage >= 100;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-muted-foreground">{icon}</span>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl font-bold text-foreground">{used.toLocaleString()}</span>
        <span className="text-sm text-muted-foreground">
          / {isUnlimited ? "∞" : limit?.toLocaleString()}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={percentage}
          className={`h-2 ${isAtLimit ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-warning" : ""}`}
        />
      )}
      {isUnlimited && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-accent/50 to-accent/20" />
        </div>
      )}
    </div>
  );
}

interface CurrentPlanUsageProps {
  usage: UsageMetrics | undefined;
  isLoading: boolean;
}

export function CurrentPlanUsage({ usage, isLoading }: CurrentPlanUsageProps) {
  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Unable to load usage data
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-4 gap-6">
      <UsageMetricCard
        label="Artifacts"
        used={usage.artifacts.used}
        limit={usage.artifacts.limit}
        icon={<FileText className="w-4 h-4" />}
      />
      <UsageMetricCard
        label="Projects"
        used={usage.projects.used}
        limit={usage.projects.limit}
        icon={<FolderOpen className="w-4 h-4" />}
      />
      <UsageMetricCard
        label="AI Runs (this month)"
        used={usage.aiRuns.used}
        limit={usage.aiRuns.limit}
        icon={<Sparkles className="w-4 h-4" />}
      />
      <UsageMetricCard
        label="Storage (MB)"
        used={usage.storage.used}
        limit={usage.storage.limit}
        icon={<HardDrive className="w-4 h-4" />}
      />
    </div>
  );
}
