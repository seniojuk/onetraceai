import { useNavigate } from "react-router-dom";
import { FileText, FolderOpen, Sparkles, HardDrive, ArrowUpRight, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { daysUntil, nextMonthReset } from "./usageCopy";

interface UsageRowProps {
  label: string;
  used: number;
  limit: number | null;
  icon: React.ElementType;
  isWarning: boolean;
  isAtLimit: boolean;
  hint?: string;
}

function UsageRow({ label, used, limit, icon: Icon, isWarning, isAtLimit, hint }: UsageRowProps) {
  const isUnlimited = limit === null;
  const percentage = isUnlimited ? 0 : limit === 0 ? 100 : Math.min((used / limit) * 100, 100);

  const barTone = isAtLimit
    ? "bg-coverage-none"
    : isWarning
    ? "bg-coverage-partial"
    : "bg-coverage-full";

  const numTone = isAtLimit
    ? "text-coverage-none"
    : isWarning
    ? "text-coverage-partial"
    : "text-foreground";

  return (
    <li className="flex items-center gap-3 px-4 sm:px-5 py-3">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] text-foreground truncate">{label}</span>
          <span className={cn("font-mono text-[11px] tabular-nums tracking-tight", numTone)}>
            {used.toLocaleString()}
            <span className="text-muted-foreground">
              {isUnlimited ? " / ∞" : ` / ${limit?.toLocaleString()}`}
            </span>
          </span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          {!isUnlimited && (
            <div
              className={cn("h-full rounded-full transition-all", barTone)}
              style={{ width: `${Math.max(percentage, 2)}%` }}
            />
          )}
        </div>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </div>
    </li>
  );
}

export function UsageDashboardWidget() {
  const navigate = useNavigate();
  const {
    usage, isLoading,
    artifactWarning, projectWarning, aiRunWarning, storageWarning,
    artifactAtLimit, projectAtLimit, aiRunAtLimit, storageAtLimit,
  } = useUsageLimits();

  const resetIn = daysUntil(nextMonthReset());

  return (
    <section className="border border-border rounded-xl bg-card">
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold text-foreground">Usage</h2>
          <span className="text-[11px] text-muted-foreground">· this workspace</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[12px]"
          onClick={() => navigate("/settings?tab=billing")}
        >
          Manage <ArrowUpRight className="w-3 h-3 ml-1" />
        </Button>
      </header>

      {isLoading ? (
        <div className="divide-y divide-border">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <Skeleton className="w-3.5 h-3.5 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-1 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : !usage ? null : (
        <ul className="divide-y divide-border">
          <UsageRow
            label="Artifacts"
            used={usage.artifacts.used}
            limit={usage.artifacts.limit}
            icon={FileText}
            isWarning={artifactWarning}
            isAtLimit={artifactAtLimit}
          />
          <UsageRow
            label="Projects"
            used={usage.projects.used}
            limit={usage.projects.limit}
            icon={FolderOpen}
            isWarning={projectWarning}
            isAtLimit={projectAtLimit}
          />
          <UsageRow
            label="AI runs"
            used={usage.aiRuns.used}
            limit={usage.aiRuns.limit}
            icon={Sparkles}
            isWarning={aiRunWarning}
            isAtLimit={aiRunAtLimit}
            hint={`Resets in ${resetIn}d`}
          />
          <UsageRow
            label="Storage (MB)"
            used={usage.storage.used}
            limit={usage.storage.limit}
            icon={HardDrive}
            isWarning={storageWarning}
            isAtLimit={storageAtLimit}
          />
        </ul>
      )}
    </section>
  );
}
