import { cn } from "@/lib/utils";

interface StepProgressProps {
  current: number; // 1-indexed
  total: number;
  label?: string;
}

/**
 * Slim mortar-grid progress bar used at the top of every onboarding step.
 * Matches the Dashboard/Drift pulse-strip language: segments separated by
 * 1px gaps over a hairline track, current step pulses subtly.
 */
export function StepProgress({ current, total, label }: StepProgressProps) {
  return (
    <div className="w-full">
      {label && (
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </span>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {current} / {total}
          </span>
        </div>
      )}
      <div className="grid w-full gap-px overflow-hidden rounded-full bg-border/60"
           style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {Array.from({ length: total }, (_, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < current;
          const isCurrent = stepNum === current;
          return (
            <div
              key={i}
              className={cn(
                "h-1.5 transition-colors duration-500",
                isDone && "bg-accent",
                isCurrent && "bg-accent/70 animate-pulse",
                !isDone && !isCurrent && "bg-muted",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
