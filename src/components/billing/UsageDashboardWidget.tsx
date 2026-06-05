import { useNavigate } from "react-router-dom";
import { FileText, FolderOpen, Sparkles, HardDrive, ArrowUpRight } from "lucide-react";
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
  delay: number;
}

function UsageRow({ label, used, limit, icon: Icon, isWarning, isAtLimit, hint, delay }: UsageRowProps) {
  const isUnlimited = limit === null;
  const percentage = isUnlimited ? 0 : limit === 0 ? 100 : Math.min((used / limit) * 100, 100);

  const barTone = isAtLimit
    ? "bg-warning"
    : isWarning
    ? "bg-warning/70"
    : "bg-accent";

  const numTone = isAtLimit || isWarning ? "text-warning" : "text-foreground";

  return (
    <li className="animate-rise-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-3 px-5 py-3">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-foreground truncate">{label}</span>
            <span className={cn("font-mono text-[11px] tabular-nums", numTone)}>
              {used.toLocaleString()}
              <span className="text-muted-foreground/70">
                {isUnlimited ? " / ∞" : ` / ${limit?.toLocaleString()}`}
              </span>
            </span>
          </div>
          <div className="mt-2 h-0.5 w-full bg-muted overflow-hidden rounded-full">
            {!isUnlimited && (
              <div
                className={cn("h-full transition-all duration-700", barTone)}
                style={{ width: `${percentage}%` }}
              />
            )}
          </div>
          {hint && (
            <div className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              {hint}
            </div>
          )}
        </div>
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

  if (isLoading) {
    return (
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Usage
          </span>
        </header>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-0.5 w-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!usage) return null;

  const anyLimit = artifactAtLimit || projectAtLimit || aiRunAtLimit || storageAtLimit;
  const anyWarn = artifactWarning || projectWarning || aiRunWarning || storageWarning;
  const resetIn = daysUntil(nextMonthReset());

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-card animate-rise-in",
        anyLimit || anyWarn ? "border-warning/40" : "border-border",
      )}
    >
      <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Usage
          </span>
          {(anyLimit || anyWarn) && (
            <span
              className={cn(
                "font-mono text-[10px] uppercase tracking-wider",
                anyLimit ? "text-warning" : "text-warning/80",
              )}
            >
              {anyLimit ? "At limit" : "Approaching"}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate("/settings?tab=billing")}
          className="group inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          Manage
          <ArrowUpRight className="h-3 w-3 transition-colors group-hover:text-foreground" />
        </button>
      </header>

      <ul className="divide-y divide-border">
        <UsageRow
          label="Artifacts"
          used={usage.artifacts.used}
          limit={usage.artifacts.limit}
          icon={FileText}
          isWarning={artifactWarning}
          isAtLimit={artifactAtLimit}
          delay={0}
        />
        <UsageRow
          label="Projects"
          used={usage.projects.used}
          limit={usage.projects.limit}
          icon={FolderOpen}
          isWarning={projectWarning}
          isAtLimit={projectAtLimit}
          delay={60}
        />
        <UsageRow
          label="AI runs"
          used={usage.aiRuns.used}
          limit={usage.aiRuns.limit}
          icon={Sparkles}
          isWarning={aiRunWarning}
          isAtLimit={aiRunAtLimit}
          hint={`Resets in ${resetIn}d`}
          delay={120}
        />
        <UsageRow
          label="Storage (MB)"
          used={usage.storage.used}
          limit={usage.storage.limit}
          icon={HardDrive}
          isWarning={storageWarning}
          isAtLimit={storageAtLimit}
          delay={180}
        />
      </ul>
    </section>
  );
}
