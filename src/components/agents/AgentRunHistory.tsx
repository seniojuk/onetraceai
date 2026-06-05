import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ChevronRight,
  History,
} from "lucide-react";
import type { AIRun, AIRunStatus } from "@/hooks/useAIRuns";
import { cn } from "@/lib/utils";
import { AgentRunResultsDialog } from "./AgentRunResultsDialog";

interface AgentRunHistoryProps {
  runs: (AIRun & {
    agent_config: { id: string; name: string; agent_type: string } | null;
    model: { id: string; model_name: string; display_name: string } | null;
  })[];
  isLoading?: boolean;
  onViewRun?: (run: AIRun) => void;
  workspaceId: string;
  projectId?: string;
}

type Filter = "ALL" | "RUNNING" | "COMPLETED" | "FAILED";

function StatusIcon({ status }: { status: AIRunStatus }) {
  if (status === "RUNNING")
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />;
  if (status === "COMPLETED")
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />;
  if (status === "FAILED" || status === "CANCELLED")
    return <XCircle className="h-4 w-4 shrink-0 text-drift" />;
  return <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

export function AgentRunHistory({
  runs,
  isLoading,
  onViewRun,
  workspaceId,
  projectId,
}: AgentRunHistoryProps) {
  const [selectedRun, setSelectedRun] = useState<(typeof runs)[number] | null>(null);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("ALL");

  const counts = {
    ALL: runs.length,
    RUNNING: runs.filter((r) => r.status === "RUNNING").length,
    COMPLETED: runs.filter((r) => r.status === "COMPLETED").length,
    FAILED: runs.filter((r) => r.status === "FAILED" || r.status === "CANCELLED").length,
  };

  const visible =
    filter === "ALL"
      ? runs
      : filter === "FAILED"
        ? runs.filter((r) => r.status === "FAILED" || r.status === "CANCELLED")
        : runs.filter((r) => r.status === filter);

  const handleViewRun = (run: (typeof runs)[number]) => {
    setSelectedRun(run);
    setResultsDialogOpen(true);
    onViewRun?.(run);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
    );
  }

  if (!runs.length) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
        <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <History className="h-5 w-5" />
        </div>
        <h3 className="font-display text-xl font-semibold text-foreground">
          No runs yet.
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Invoke an agent and the trail of what ran, what cost, and what came
          out lives here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Inline filter strip */}
      <div className="flex flex-wrap gap-1">
        {(
          [
            { k: "ALL", label: "All" },
            { k: "RUNNING", label: "Running" },
            { k: "COMPLETED", label: "Completed" },
            { k: "FAILED", label: "Failed" },
          ] as const
        ).map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.k
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            )}
          >
            {f.label}
            <span className="font-mono tabular-nums opacity-70">{counts[f.k]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          No {filter.toLowerCase()} runs.
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {visible.map((run) => {
            const outputCount = Array.isArray(run.output_artifacts)
              ? run.output_artifacts.length
              : 0;
            const agentName =
              run.agent_config?.name ||
              (run.metadata &&
              typeof run.metadata === "object" &&
              "generationType" in run.metadata
                ? `${(run.metadata as { generationType: string }).generationType} Generator`
                : "Unknown agent");

            return (
              <button
                key={run.id}
                onClick={() => handleViewRun(run)}
                className="group flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <StatusIcon status={run.status} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {agentName}
                    </p>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      {run.run_type.toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {run.model?.display_name || "—"}
                    {run.started_at && (
                      <>
                        {" · "}
                        {formatDistanceToNow(new Date(run.started_at), {
                          addSuffix: true,
                        })}
                      </>
                    )}
                    {run.status === "FAILED" && run.error_message && (
                      <span className="text-drift"> · {run.error_message}</span>
                    )}
                  </p>
                </div>

                <div className="hidden items-center gap-4 text-xs text-muted-foreground tabular-nums sm:flex">
                  {run.status === "COMPLETED" && (
                    <span>
                      {outputCount} output{outputCount === 1 ? "" : "s"}
                    </span>
                  )}
                  {run.total_cost !== null && run.total_cost > 0 && (
                    <span>${run.total_cost.toFixed(4)}</span>
                  )}
                  {run.duration_ms !== null && run.duration_ms > 0 && (
                    <span>{(run.duration_ms / 1000).toFixed(1)}s</span>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </button>
            );
          })}
        </div>
      )}

      <AgentRunResultsDialog
        open={resultsDialogOpen}
        onOpenChange={setResultsDialogOpen}
        run={selectedRun}
        workspaceId={workspaceId}
        projectId={projectId}
      />
    </div>
  );
}
