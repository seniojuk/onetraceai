import { useNavigate } from "react-router-dom";
import { ArrowUpRight, CheckCircle2, X, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboardingChecklist } from "@/hooks/useOnboardingChecklist";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

/**
 * Dashboard widget that walks the user from "first PRD" to "Jira pushed".
 * Mounts only when the user is mid-onboarding and has not dismissed it.
 */
export function SetupChecklist() {
  const navigate = useNavigate();
  const { items, completed, total } = useOnboardingChecklist();
  const { dismissedSetupChecklist, setDismissedSetupChecklist } = useUIStore();

  if (dismissedSetupChecklist) return null;
  if (completed >= total) return null;

  // Sort: incomplete first (preserves declared order), then completed at bottom.
  const sorted = [...items].sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card animate-rise-in">
      <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Complete Your setup
          </span>
          <span className="font-mono text-[11px] tabular-nums text-foreground">
            {completed} / {total}
          </span>
        </div>
        <button
          aria-label="Dismiss setup checklist"
          onClick={() => setDismissedSetupChecklist(true)}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </header>

      {/* Progress hairline */}
      <div className="h-0.5 w-full bg-muted">
        <div
          className="h-full bg-accent transition-all duration-700"
          style={{ width: `${(completed / total) * 100}%` }}
        />
      </div>

      <ul className="divide-y divide-border">
        {sorted.map((item, i) => (
          <li
            key={item.id}
            className="animate-rise-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <button
              onClick={() => navigate(item.href)}
              className={cn(
                "group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors",
                item.done ? "hover:bg-transparent" : "hover:bg-muted/40",
              )}
            >
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-coverage-full" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              )}
              <span
                className={cn(
                  "flex-1 text-[13px]",
                  item.done ? "text-muted-foreground line-through" : "text-foreground",
                )}
              >
                {item.label}
              </span>
              {!item.done && (
                <>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    {item.estimate}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
                </>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
